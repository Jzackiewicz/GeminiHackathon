import json
import os

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from db import get_db
from dependencies import get_current_user
from models import InterviewSave, InterviewOut
from services.vapi import create_interview_assistant, delete_assistant
from services.llm import prompt_with_context
from services.prompts import get_prompt


class InterviewUpdateReview(BaseModel):
    review: dict
    score: int | None = None


class InterviewStartRequest(BaseModel):
    personality: str = "Professional"
    interview_type: str = "technical"
    job_context: str = ""
    job_slug: str | None = None


class InterviewStartOut(BaseModel):
    id: int
    assistant_id: str
    public_key: str


class InterviewChatRequest(BaseModel):
    messages: list[dict]


class InterviewCompleteRequest(BaseModel):
    transcript: list[dict]


class InterviewReviewRequest(BaseModel):
    transcript: list[dict]


router = APIRouter(prefix="/api/interviews")


# ---------------------------------------------------------------------------
# VAPI config
# ---------------------------------------------------------------------------

@router.get("/vapi-config")
def vapi_config():
    return {"public_key": os.getenv("VAPI_PUBLIC_KEY", "")}


@router.post("/auto-configure")
def auto_configure(user_id: int = Depends(get_current_user)):
    """Use Gemini to suggest optimal interview settings based on profile + history."""
    db = get_db()
    profile = db.execute("SELECT * FROM profiles WHERE user_id = ?", (user_id,)).fetchone()
    interviews = db.execute(
        "SELECT job_title, review, score FROM interviews WHERE user_id = ? AND review IS NOT NULL ORDER BY created_at DESC LIMIT 10",
        (user_id,),
    ).fetchall()
    db.close()

    if not profile:
        raise HTTPException(404, "No profile found")

    # Build profile section
    profile_parts = []
    if profile["experience_level"]:
        profile_parts.append(f"Summary: {profile['summary'] or ''}")
        profile_parts.append(f"Experience Level: {profile['experience_level']}")
        profile_parts.append(f"Primary Role: {profile['primary_role'] or ''}")
        techs = json.loads(profile["technologies"]) if profile["technologies"] else []
        if techs:
            tech_strs = [f"{t['name']} ({t.get('proficiency', 'unknown')})" if isinstance(t, dict) else t for t in techs]
            profile_parts.append(f"Technologies: {', '.join(tech_strs)}")
        strengths = json.loads(profile["strengths"]) if profile["strengths"] else []
        if strengths:
            profile_parts.append(f"Strengths: {', '.join(strengths)}")

    if profile["github_raw"]:
        try:
            gh = json.loads(profile["github_raw"])
            langs = gh.get("languages", {})
            if langs:
                top = [f"{l} ({d.get('percent', 0)}%)" for l, d in list(langs.items())[:10]]
                profile_parts.append(f"GitHub Languages: {', '.join(top)}")
        except (json.JSONDecodeError, TypeError):
            pass

    profile_section = "\n".join(profile_parts) if profile_parts else "No profile data available."

    # Build interviews section
    interviews_parts = []
    for iv in interviews:
        review = json.loads(iv["review"]) if iv["review"] else None
        if not review:
            continue
        interviews_parts.append(f"Interview for {iv['job_title'] or 'Unknown'} — Score: {review.get('overall_score', '?')}/10")
        for w in review.get("weaknesses", []):
            interviews_parts.append(f"  Weakness: {w.get('area')}")
        for r in review.get("recommendations", []):
            interviews_parts.append(f"  Recommendation: {r.get('topic')}")

    interviews_section = "\n".join(interviews_parts) if interviews_parts else "No interview history."

    system = get_prompt("interview_configurator", "system")
    user_prompt = get_prompt(
        "interview_configurator", "user",
        profile_section=profile_section,
        interviews_section=interviews_section,
    )

    try:
        raw = prompt_with_context("", user_prompt, system=system)
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1]
        if cleaned.endswith("```"):
            cleaned = cleaned.rsplit("```", 1)[0]
        config = json.loads(cleaned.strip())
        return {"config": config}
    except Exception as e:
        raise HTTPException(500, f"Failed to auto-configure: {e}")


# ---------------------------------------------------------------------------
# Start interview (creates VAPI assistant)
# ---------------------------------------------------------------------------

PERSONALITY_TO_DIFFICULTY = {
    "Professional": "medium",
    "Friendly": "easy",
    "Tough": "hard",
    "Casual": "easy",
}

@router.post("/start", response_model=InterviewStartOut)
def start_interview(body: InterviewStartRequest, user_id: int = Depends(get_current_user)):
    db = get_db()
    profile = db.execute("SELECT * FROM profiles WHERE user_id = ?", (user_id,)).fetchone()
    if not profile or not profile["experience_level"]:
        db.close()
        raise HTTPException(400, "Profile analysis not ready yet")

    # Build params for VAPI assistant
    techs_raw = json.loads(profile["technologies"]) if profile["technologies"] else []
    tech_names = [t["name"] if isinstance(t, dict) else t for t in techs_raw]
    user_name = profile["github_username"] or "Candidate"
    summary = profile["summary"] or ""

    # Extract job context or use defaults
    job_title = "Software Developer"
    company = None
    requirements = ", ".join(tech_names[:5]) if tech_names else ""

    if body.job_context:
        # Use the pasted job context as requirements
        requirements = body.job_context
        # Try to extract title from first line
        lines = body.job_context.strip().split("\n")
        if lines:
            first_line = lines[0].strip()
            if len(first_line) < 80:
                job_title = first_line

    difficulty = PERSONALITY_TO_DIFFICULTY.get(body.personality, "medium")
    interview_type = body.interview_type.lower().replace(" ", "_")

    assistant_id = create_interview_assistant(
        user_name=user_name,
        technologies=tech_names,
        summary=summary,
        job_title=job_title,
        company=company,
        requirements=requirements,
        difficulty=difficulty,
        interview_type=interview_type,
    )

    cur = db.execute(
        """INSERT INTO interviews (user_id, mode, job_slug, job_title, company, requirements, assistant_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (user_id, body.interview_type, body.job_slug, job_title, company, requirements, assistant_id),
    )
    db.commit()
    interview_id = cur.lastrowid
    db.close()

    return InterviewStartOut(
        id=interview_id,
        assistant_id=assistant_id,
        public_key=os.getenv("VAPI_PUBLIC_KEY", ""),
    )


# ---------------------------------------------------------------------------
# Text chat with VAPI assistant
# ---------------------------------------------------------------------------

@router.post("/{interview_id}/chat")
async def interview_chat(
    interview_id: int,
    body: InterviewChatRequest,
    user_id: int = Depends(get_current_user),
):
    db = get_db()
    row = db.execute(
        "SELECT * FROM interviews WHERE id = ? AND user_id = ?",
        (interview_id, user_id),
    ).fetchone()
    db.close()
    if not row:
        raise HTTPException(404, "Interview not found")
    if not row["assistant_id"]:
        raise HTTPException(400, "No assistant for this interview")

    api_key = os.getenv("VAPI_API_KEY")
    if not api_key:
        raise HTTPException(500, "VAPI_API_KEY not configured")

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.vapi.ai/chat",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"assistantId": row["assistant_id"], "input": body.messages},
        )
        if resp.status_code not in (200, 201):
            raise HTTPException(502, f"VAPI API error: {resp.status_code}")

        data = resp.json()
        return {"output": data.get("output", [])}


# ---------------------------------------------------------------------------
# Complete interview (save transcript, cleanup assistant)
# ---------------------------------------------------------------------------

@router.post("/{interview_id}/complete")
def complete_interview(
    interview_id: int,
    body: InterviewCompleteRequest,
    user_id: int = Depends(get_current_user),
):
    db = get_db()
    row = db.execute(
        "SELECT * FROM interviews WHERE id = ? AND user_id = ?",
        (interview_id, user_id),
    ).fetchone()
    if not row:
        db.close()
        raise HTTPException(404, "Interview not found")

    db.execute(
        "UPDATE interviews SET transcript = ? WHERE id = ?",
        (json.dumps(body.transcript), interview_id),
    )
    db.commit()
    db.close()

    if row["assistant_id"]:
        try:
            delete_assistant(row["assistant_id"])
        except Exception:
            pass

    return {"ok": True}


# ---------------------------------------------------------------------------
# Review interview transcript with Gemini
# ---------------------------------------------------------------------------

@router.post("/{interview_id}/review")
def review_interview_transcript(
    interview_id: int,
    body: InterviewReviewRequest,
    user_id: int = Depends(get_current_user),
):
    db = get_db()
    row = db.execute(
        "SELECT * FROM interviews WHERE id = ? AND user_id = ?",
        (interview_id, user_id),
    ).fetchone()
    if not row:
        db.close()
        raise HTTPException(404, "Interview not found")

    profile = db.execute("SELECT * FROM profiles WHERE user_id = ?", (user_id,)).fetchone()

    # Format transcript
    transcript_text = "\n".join(
        f"{'Interviewer' if t['role'] == 'assistant' else 'Candidate'}: {t['text']}"
        for t in body.transcript
    )

    # Build profile context
    profile_parts = []
    if profile:
        techs_raw = json.loads(profile["technologies"]) if profile["technologies"] else []
        profile_parts.append(f"Profile Analysis Summary: {profile['summary'] or ''}")
        profile_parts.append(f"Experience Level: {profile['experience_level'] or ''}")
        profile_parts.append(f"Primary Role: {profile['primary_role'] or ''}")
        techs = [
            (t["name"] + f" ({t.get('proficiency', '')})" if isinstance(t, dict) else t)
            for t in techs_raw
        ]
        if techs:
            profile_parts.append(f"Known Technologies: {', '.join(techs)}")
        strengths = json.loads(profile["strengths"]) if profile["strengths"] else []
        if strengths:
            profile_parts.append(f"Strengths: {', '.join(strengths)}")
        notable = json.loads(profile["notable_projects"]) if profile["notable_projects"] else []
        if notable:
            profile_parts.append("Notable Projects:")
            for p in notable:
                profile_parts.append(f"  - {p.get('name', '')}: {p.get('description', '')} [{', '.join(p.get('technologies', []))}]")

        if profile["github_raw"]:
            try:
                gh = json.loads(profile["github_raw"])
                langs = gh.get("languages", {})
                if langs:
                    top = [f"{l} ({d.get('percent',0)}%)" for l, d in list(langs.items())[:10]]
                    profile_parts.append(f"GitHub Languages (by code volume): {', '.join(top)}")
                repos = gh.get("repos", [])
                if repos:
                    profile_parts.append("GitHub Repos:")
                    for r in repos[:10]:
                        desc = f" — {r['description']}" if r.get("description") else ""
                        profile_parts.append(f"  - {r['name']}{desc} [{', '.join(r.get('languages', {}).keys())}]")
            except (json.JSONDecodeError, TypeError):
                pass

    profile_section = ""
    if profile_parts:
        profile_section = "Candidate's Actual Profile (from GitHub analysis — use this to identify missed opportunities):\n" + "\n".join(profile_parts)

    job_title = row["job_title"] or "Not specified"
    company = row["company"] or "Not specified"
    requirements = row["requirements"] or "Not specified"

    system = get_prompt("interview_review", "system")
    user_prompt = get_prompt(
        "interview_review", "user",
        job_title=job_title,
        company=company,
        requirements=requirements,
        profile_section=profile_section,
    )

    try:
        raw = prompt_with_context(transcript_text, user_prompt, system=system)
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1]
        if cleaned.endswith("```"):
            cleaned = cleaned.rsplit("```", 1)[0]
        review = json.loads(cleaned.strip())

        score = review.get("overall_score")
        feedback = review.get("overall_assessment", "")
        db.execute(
            "UPDATE interviews SET review = ?, score = ? WHERE id = ?",
            (json.dumps(review), score, interview_id),
        )
        db.commit()
        db.close()

        return {"review": review}
    except Exception as e:
        db.close()
        return {"error": str(e)}


# ---------------------------------------------------------------------------
# Existing CRUD endpoints
# ---------------------------------------------------------------------------

@router.post("", response_model=InterviewOut)
def save_interview(body: InterviewSave, user_id: int = Depends(get_current_user)):
    db = get_db()
    cur = db.execute(
        """INSERT INTO interviews (user_id, mode, job_slug, job_title, company, requirements, transcript, review, score)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            user_id,
            body.mode,
            body.job_slug,
            body.job_title,
            body.company,
            body.requirements,
            json.dumps(body.transcript),
            json.dumps(body.review) if body.review else None,
            body.score,
        ),
    )
    db.commit()
    interview_id = cur.lastrowid
    db.close()
    return InterviewOut(
        id=interview_id,
        mode=body.mode,
        job_slug=body.job_slug,
        job_title=body.job_title,
        company=body.company,
        requirements=body.requirements,
        transcript=body.transcript,
        review=body.review,
        score=body.score,
    )


@router.get("", response_model=list[InterviewOut])
def list_interviews(user_id: int = Depends(get_current_user)):
    db = get_db()
    rows = db.execute(
        "SELECT * FROM interviews WHERE user_id = ? ORDER BY created_at DESC",
        (user_id,),
    ).fetchall()
    db.close()
    return [
        InterviewOut(
            id=r["id"],
            mode=r["mode"],
            job_slug=r["job_slug"],
            job_title=r["job_title"],
            company=r["company"],
            requirements=r["requirements"],
            transcript=json.loads(r["transcript"]) if r["transcript"] else [],
            review=json.loads(r["review"]) if r["review"] else None,
            score=r["score"],
            created_at=r["created_at"],
        )
        for r in rows
    ]


@router.get("/{interview_id}", response_model=InterviewOut)
def get_interview(interview_id: int, user_id: int = Depends(get_current_user)):
    db = get_db()
    r = db.execute(
        "SELECT * FROM interviews WHERE id = ? AND user_id = ?",
        (interview_id, user_id),
    ).fetchone()
    db.close()
    if not r:
        raise HTTPException(404)
    return InterviewOut(
        id=r["id"],
        mode=r["mode"],
        job_title=r["job_title"],
        company=r["company"],
        requirements=r["requirements"],
        transcript=json.loads(r["transcript"]) if r["transcript"] else [],
        review=json.loads(r["review"]) if r["review"] else None,
        score=r["score"],
        created_at=r["created_at"],
    )


@router.patch("/{interview_id}/review", response_model=InterviewOut)
def update_interview_review(interview_id: int, body: InterviewUpdateReview, user_id: int = Depends(get_current_user)):
    db = get_db()
    r = db.execute("SELECT * FROM interviews WHERE id = ? AND user_id = ?", (interview_id, user_id)).fetchone()
    if not r:
        db.close()
        raise HTTPException(404)
    db.execute(
        "UPDATE interviews SET review = ?, score = ? WHERE id = ?",
        (json.dumps(body.review), body.score or body.review.get("overall_score"), interview_id),
    )
    db.commit()
    r = db.execute("SELECT * FROM interviews WHERE id = ?", (interview_id,)).fetchone()
    db.close()
    return InterviewOut(
        id=r["id"],
        mode=r["mode"],
        job_title=r["job_title"],
        company=r["company"],
        requirements=r["requirements"],
        transcript=json.loads(r["transcript"]) if r["transcript"] else [],
        review=json.loads(r["review"]) if r["review"] else None,
        score=r["score"],
        created_at=r["created_at"],
    )
