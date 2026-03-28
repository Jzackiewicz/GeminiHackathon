import asyncio
import json
import logging
import os

import subprocess
import tempfile
from pathlib import Path

from fastapi import APIRouter, Header
from pydantic import BaseModel
from fastapi.responses import StreamingResponse, FileResponse
from db import get_db
from dependencies import get_current_user
from services.scraper import deep_scrape_github
from services.llm import analyze_github_profile, prompt_with_context, score_offers_against_profile
from services.vapi import create_interview_assistant, create_job_discovery_assistant, delete_assistant
from services.prompts import get_prompt
from services import logstream
from services.stitch import start_generation, get_job, build_cv_prompt
from services.jjit import fetch_and_store_offers, get_fetch_status, get_cached_offers
from services.cache import cached, cache_stats, invalidate_all as cache_invalidate_all

router = APIRouter(prefix="/api/debug")
log = logging.getLogger("debug")


@router.get("/scrape/{username}")
@cached
async def debug_scrape(username: str, authorization: str = Header(None)):
    """Scrape a GitHub user and return what would be sent to Gemini."""
    # Try to use the logged-in user's GitHub token for private repo access
    token = None
    if authorization and authorization.startswith("Bearer "):
        from services.auth import decode_token
        user_id = decode_token(authorization.removeprefix("Bearer ").strip())
        if user_id:
            db = get_db()
            row = db.execute("SELECT github_token FROM users WHERE id = ?", (user_id,)).fetchone()
            db.close()
            if row and row["github_token"]:
                token = row["github_token"]
                log.info(f"Using OAuth token for {username} (private repos included)")

    log.info(f"Starting deep scrape for {username}")
    github_data = await deep_scrape_github(username, token=token)
    log.info(f"Scrape complete: {len(github_data.get('repos', []))} repos, {len(github_data.get('languages', {}))} languages")
    context = json.dumps(github_data, indent=2, default=str)
    system_prompt = get_prompt("profile_analysis", "system")
    user_prompt = get_prompt("profile_analysis", "user")

    return {
        "github_data": github_data,
        "gemini_payload": {
            "system": system_prompt,
            "user": f"<context>\n{context}\n</context>\n\n{user_prompt}",
            "estimated_tokens": len(context) // 4,
        },
    }


@router.post("/analyze")
@cached
async def debug_analyze(body: dict):
    """Run Gemini analysis on previously scraped GitHub data."""
    log.info("Starting Gemini profile analysis")
    try:
        result = analyze_github_profile(body)
        log.info(f"Gemini analysis complete: {result.get('experience_level')} {result.get('primary_role')}")
        return {"analysis": result}
    except Exception as e:
        log.error(f"Gemini analysis failed: {e}")
        return {"error": str(e)}


MOCK_JOB_OFFERS = [
    {
        "id": "mock-1",
        "title": "Senior Backend Developer",
        "company": "DataFlow Inc.",
        "location": "Remote",
        "salary": "$120k-$160k",
        "requirements": "Python, FastAPI, PostgreSQL, Redis, Docker, AWS",
        "description": "Build and maintain high-throughput data pipelines and REST APIs serving 10M+ requests/day. Strong focus on performance optimization and system reliability.",
    },
    {
        "id": "mock-2",
        "title": "Full-Stack Engineer",
        "company": "StartupXYZ",
        "location": "Berlin (Hybrid)",
        "salary": "€70k-€90k",
        "requirements": "TypeScript, React, Node.js, PostgreSQL, GraphQL",
        "description": "Join a 10-person team building a B2B SaaS platform. You'll own features end-to-end from database schema to UI components.",
    },
    {
        "id": "mock-3",
        "title": "Platform Engineer",
        "company": "CloudScale",
        "location": "Remote (EU)",
        "salary": "€90k-€120k",
        "requirements": "Go, Kubernetes, Terraform, AWS/GCP, CI/CD, Prometheus",
        "description": "Design and operate the infrastructure platform for 50+ microservices. Focus on developer experience, reliability, and cost optimization.",
    },
    {
        "id": "mock-4",
        "title": "ML Engineer",
        "company": "AI Solutions Ltd.",
        "location": "London",
        "salary": "£80k-£110k",
        "requirements": "Python, PyTorch, MLflow, Docker, SQL, REST APIs",
        "description": "Productionize ML models for NLP and recommendation systems. Bridge the gap between research prototypes and scalable production services.",
    },
    {
        "id": "mock-5",
        "title": "Frontend Developer",
        "company": "DesignCraft",
        "location": "Remote",
        "salary": "$90k-$120k",
        "requirements": "React, TypeScript, Tailwind CSS, Next.js, Figma",
        "description": "Build pixel-perfect, accessible UI components for a design system used by 200+ enterprise clients. Strong focus on performance and a11y.",
    },
]


@router.get("/jobs/mock")
def list_mock_jobs():
    """Return mock job offers for testing."""
    return {"jobs": MOCK_JOB_OFFERS}


class VapiTestRequest(BaseModel):
    mode: str = "interview"  # "interview" or "job_discovery"
    user_name: str = "Test User"
    technologies: list[str] = ["Python", "JavaScript"]
    summary: str = "Experienced developer"
    job_title: str = "Senior Backend Developer"
    company: str | None = "Test Corp"
    requirements: str | None = "Python, FastAPI, PostgreSQL"
    difficulty: str = "medium"  # easy, medium, hard, faang
    interview_type: str = "technical"  # technical, behavioral, system_design, mixed


@router.get("/vapi/config")
def vapi_config():
    """Return VAPI public key for frontend SDK."""
    return {"public_key": os.getenv("VAPI_PUBLIC_KEY", "")}


@router.post("/vapi/assistant")
def create_test_assistant(body: VapiTestRequest):
    """Create a temporary VAPI assistant for testing."""
    log.info(f"Creating VAPI {body.mode} assistant for {body.user_name}")
    try:
        if body.mode == "job_discovery":
            assistant_id = create_job_discovery_assistant(
                user_name=body.user_name,
                technologies=body.technologies,
                summary=body.summary,
            )
        else:
            assistant_id = create_interview_assistant(
                user_name=body.user_name,
                technologies=body.technologies,
                summary=body.summary,
                job_title=body.job_title,
                company=body.company,
                requirements=body.requirements,
                difficulty=body.difficulty,
                interview_type=body.interview_type,
            )
        log.info(f"VAPI assistant created: {assistant_id}")
        return {"assistant_id": assistant_id}
    except Exception as e:
        log.error(f"VAPI assistant creation failed: {e}")
        return {"error": str(e)}


@router.delete("/vapi/assistant/{assistant_id}")
def cleanup_assistant(assistant_id: str):
    """Delete a test assistant."""
    try:
        delete_assistant(assistant_id)
        log.info(f"VAPI assistant deleted: {assistant_id}")
        return {"ok": True}
    except Exception as e:
        log.error(f"VAPI assistant deletion failed: {e}")
        return {"error": str(e)}


class InterviewReviewRequest(BaseModel):
    transcript: list[dict]  # [{role, text}, ...]
    job_title: str = ""
    company: str = ""
    requirements: str = ""
    github_data: dict | None = None  # raw scraped GitHub data
    profile_analysis: dict | None = None  # Gemini profile analysis


@router.post("/vapi/review")
@cached
def review_interview(body: InterviewReviewRequest):
    """Use Gemini to review an interview transcript with full profile context."""
    # Format transcript as readable text
    transcript_text = "\n".join(
        f"{'Interviewer' if t['role'] == 'assistant' else 'Candidate'}: {t['text']}"
        for t in body.transcript
    )

    # Build profile section if available
    profile_parts = []
    if body.profile_analysis:
        a = body.profile_analysis
        profile_parts.append(f"Profile Analysis Summary: {a.get('summary', '')}")
        profile_parts.append(f"Experience Level: {a.get('experience_level', '')}")
        profile_parts.append(f"Primary Role: {a.get('primary_role', '')}")
        techs = [t.get('name', '') + f" ({t.get('proficiency', '')})" for t in a.get('technologies', [])]
        if techs:
            profile_parts.append(f"Known Technologies: {', '.join(techs)}")
        strengths = a.get('strengths', [])
        if strengths:
            profile_parts.append(f"Strengths: {', '.join(strengths)}")
        projects = a.get('notable_projects', [])
        if projects:
            profile_parts.append("Notable Projects:")
            for p in projects:
                profile_parts.append(f"  - {p.get('name', '')}: {p.get('description', '')} [{', '.join(p.get('technologies', []))}]")

    if body.github_data:
        gh = body.github_data
        langs = gh.get('languages', {})
        if langs:
            top = [f"{l} ({d.get('percent',0)}%)" for l, d in list(langs.items())[:10]]
            profile_parts.append(f"GitHub Languages (by code volume): {', '.join(top)}")
        repos = gh.get('repos', [])
        if repos:
            profile_parts.append("GitHub Repos:")
            for r in repos[:10]:
                desc = f" — {r['description']}" if r.get('description') else ""
                profile_parts.append(f"  - {r['name']}{desc} [{', '.join(r.get('languages', {}).keys())}]")
                if r.get('readme'):
                    profile_parts.append(f"    README excerpt: {r['readme'][:300]}")

    profile_section = ""
    if profile_parts:
        profile_section = "Candidate's Actual Profile (from GitHub analysis — use this to identify missed opportunities):\n" + "\n".join(profile_parts)

    system = get_prompt("interview_review", "system")
    user_prompt = get_prompt(
        "interview_review", "user",
        job_title=body.job_title or "Not specified",
        company=body.company or "Not specified",
        requirements=body.requirements or "Not specified",
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
        return {"review": review}
    except Exception as e:
        return {"error": str(e)}


class ChatMessage(BaseModel):
    assistant_id: str
    messages: list[dict]  # full conversation history


@router.post("/vapi/chat")
async def vapi_chat(body: ChatMessage):
    """Text-only chat with a VAPI assistant. Sends full message history for context."""
    import httpx
    api_key = os.getenv("VAPI_API_KEY")
    if not api_key:
        return {"error": "VAPI_API_KEY not set"}

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.vapi.ai/chat",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "assistantId": body.assistant_id,
                "input": body.messages,
            },
        )
        if resp.status_code != 200 and resp.status_code != 201:
            return {"error": f"VAPI API error: {resp.status_code} {resp.text[:200]}"}

        data = resp.json()
        return {
            "output": data.get("output", []),
        }


class CVGenerateRequest(BaseModel):
    github_data: dict | None = None
    profile_analysis: dict | None = None
    job_title: str | None = None
    company: str | None = None
    requirements: str | None = None


@router.post("/cv/generate")
@cached
async def generate_cv(body: CVGenerateRequest):
    """Start async CV generation via Google Stitch. Returns a job_id for polling."""
    log.info("Starting CV generation")
    try:
        job_id = await start_generation(
            github_data=body.github_data,
            profile_analysis=body.profile_analysis,
            job_title=body.job_title,
            company=body.company,
            requirements=body.requirements,
        )
        return {"job_id": job_id}
    except Exception as e:
        log.error(f"CV generation start failed: {e}")
        return {"error": str(e)}


@router.get("/cv/status/{job_id}")
def cv_status(job_id: str):
    """Poll for CV generation status."""
    job = get_job(job_id)
    if not job:
        return {"error": "Job not found"}
    return job


@router.post("/cv/preview-prompt")
@cached
def cv_preview_prompt(body: CVGenerateRequest):
    """Preview the Stitch prompt that would be generated from the given data."""
    try:
        prompt = build_cv_prompt(
            github_data=body.github_data,
            profile_analysis=body.profile_analysis,
            job_title=body.job_title,
            company=body.company,
            requirements=body.requirements,
        )
        return {"prompt": prompt}
    except Exception as e:
        return {"error": str(e)}


class InterviewConfigRequest(BaseModel):
    github_data: dict | None = None
    profile_analysis: dict | None = None
    interviews: list[dict] | None = None


@router.post("/vapi/auto-configure")
@cached
def auto_configure_interview(body: InterviewConfigRequest):
    """Use Gemini to suggest optimal interview settings based on profile."""
    # Build profile section
    profile_parts = []
    if body.profile_analysis:
        a = body.profile_analysis
        profile_parts.append(f"Summary: {a.get('summary', '')}")
        profile_parts.append(f"Experience Level: {a.get('experience_level', '')}")
        profile_parts.append(f"Primary Role: {a.get('primary_role', '')}")
        techs = [f"{t.get('name')} ({t.get('proficiency')})" for t in a.get('technologies', [])]
        if techs:
            profile_parts.append(f"Technologies: {', '.join(techs)}")
        strengths = a.get('strengths', [])
        if strengths:
            profile_parts.append(f"Strengths: {', '.join(strengths)}")

    if body.github_data:
        gh = body.github_data
        langs = gh.get('languages', {})
        if langs:
            top = [f"{l} ({d.get('percent', 0)}%)" for l, d in list(langs.items())[:10]]
            profile_parts.append(f"GitHub Languages: {', '.join(top)}")

    profile_section = "\n".join(profile_parts) if profile_parts else "No profile data available."

    # Build interviews section
    interviews_parts = []
    if body.interviews:
        for iv in body.interviews:
            review = iv.get('review')
            if not review:
                continue
            interviews_parts.append(f"Interview for {iv.get('job_title', 'Unknown')} — Score: {review.get('overall_score', '?')}/10, Recommendation: {review.get('hiring_recommendation', '?')}")
            for w in review.get('weaknesses', []):
                interviews_parts.append(f"  Weakness: {w.get('area')}")
            for r in review.get('recommendations', []):
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
        return {"error": str(e)}


class CareerAdvisorRequest(BaseModel):
    github_data: dict | None = None
    profile_analysis: dict | None = None
    interviews: list[dict] | None = None  # list of past interviews with reviews


@router.post("/career/advise")
def career_advise(body: CareerAdvisorRequest, authorization: str = Header(None)):
    """Generate career suggestions from full profile context."""
    # Build profile section
    profile_parts = []
    if body.profile_analysis:
        a = body.profile_analysis
        profile_parts.append(f"Summary: {a.get('summary', '')}")
        profile_parts.append(f"Experience Level: {a.get('experience_level', '')}")
        profile_parts.append(f"Primary Role: {a.get('primary_role', '')}")
        techs = [f"{t.get('name')} ({t.get('proficiency')})" for t in a.get('technologies', [])]
        if techs:
            profile_parts.append(f"Technologies: {', '.join(techs)}")
        strengths = a.get('strengths', [])
        if strengths:
            profile_parts.append(f"Strengths: {', '.join(strengths)}")
        projects = a.get('notable_projects', [])
        if projects:
            profile_parts.append("Notable Projects:")
            for p in projects:
                profile_parts.append(f"  - {p.get('name')}: {p.get('description', '')} [{', '.join(p.get('technologies', []))}]")

    if body.github_data:
        gh = body.github_data
        langs = gh.get('languages', {})
        if langs:
            top = [f"{l} ({d.get('percent', 0)}%)" for l, d in list(langs.items())[:10]]
            profile_parts.append(f"GitHub Languages: {', '.join(top)}")
        profile_parts.append(f"Original repos: {gh.get('original_repos_count', '?')}")
        profile_parts.append(f"Account age: since {gh.get('account_created', '?')[:4]}")
        topics = gh.get('topics', {})
        if topics:
            profile_parts.append(f"Topics: {', '.join(list(topics.keys())[:15])}")

    profile_section = ""
    if profile_parts:
        profile_section = "Developer Profile:\n" + "\n".join(profile_parts)

    # Build interviews section
    interviews_parts = []
    if body.interviews:
        for iv in body.interviews:
            review = iv.get('review')
            if not review:
                continue
            interviews_parts.append(f"Interview for {iv.get('job_title', 'Unknown')} — Score: {review.get('overall_score', '?')}/10, Recommendation: {review.get('hiring_recommendation', '?')}")
            interviews_parts.append(f"  Assessment: {review.get('overall_assessment', '')}")
            for w in review.get('weaknesses', []):
                interviews_parts.append(f"  Weakness: {w.get('area')} — {w.get('detail')}")
            for m in review.get('missed_opportunities', []):
                interviews_parts.append(f"  Missed: {m.get('topic')} — {m.get('suggestion')}")
            for r in review.get('recommendations', []):
                interviews_parts.append(f"  Recommendation: {r.get('topic')} — {r.get('action')}")

    interviews_section = ""
    if interviews_parts:
        interviews_section = "Past Interview Results:\n" + "\n".join(interviews_parts)

    additional_section = "Additional data sources: None connected yet (LinkedIn, etc.)"

    system = get_prompt("career_advisor", "system")
    user_prompt = get_prompt(
        "career_advisor", "user",
        profile_section=profile_section or "No profile data available.",
        interviews_section=interviews_section or "No interview data available.",
        additional_section=additional_section,
    )

    try:
        raw = prompt_with_context("", user_prompt, system=system)
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1]
        if cleaned.endswith("```"):
            cleaned = cleaned.rsplit("```", 1)[0]
        suggestions = json.loads(cleaned.strip())

        # Persist to DB if authenticated
        if authorization and authorization.startswith("Bearer "):
            from services.auth import decode_token
            user_id = decode_token(authorization.removeprefix("Bearer ").strip())
            if user_id:
                db = get_db()
                db.execute(
                    "UPDATE profiles SET career_suggestions = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
                    (json.dumps(suggestions), user_id),
                )
                db.commit()
                db.close()

        return {"suggestions": suggestions}
    except Exception as e:
        return {"error": str(e)}


class HtmlToPdfRequest(BaseModel):
    html: str


@router.post("/cv/pdf")
@cached
async def convert_to_pdf(body: HtmlToPdfRequest):
    """Convert HTML to PDF using Puppeteer + Chromium."""
    script = Path(__file__).resolve().parent.parent / "html_to_pdf.mjs"
    node_modules = Path(__file__).resolve().parent.parent / "node_modules"

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
        pdf_path = f.name

    result = subprocess.run(
        ["node", str(script), pdf_path],
        input=body.html,
        capture_output=True,
        text=True,
        env={**os.environ, "NODE_PATH": str(node_modules)},
        timeout=60,
    )

    if result.returncode != 0:
        try:
            err = json.loads(result.stderr)
            return {"error": err.get("error", "PDF conversion failed")}
        except Exception:
            return {"error": result.stderr or "PDF conversion failed"}

    return FileResponse(pdf_path, media_type="application/pdf", filename="cv.pdf")


@router.get("/cache/stats")
def get_cache_stats():
    return cache_stats()


@router.delete("/cache")
def clear_cache():
    cache_invalidate_all()
    return {"ok": True}


class JobFetchRequest(BaseModel):
    skills: list[str] | None = None
    experience_levels: list[str] | None = None
    workplace_type: str | None = None
    max_pages: int = 3


@router.post("/jobs/fetch")
async def debug_jobs_fetch(body: JobFetchRequest):
    """Trigger a JustJoinIT fetch. Runs in background."""
    log.info(f"Starting JJIT fetch: skills={body.skills}, exp={body.experience_levels}")
    try:
        asyncio.create_task(fetch_and_store_offers(
            skills=body.skills,
            experience_levels=body.experience_levels,
            workplace_type=body.workplace_type,
            max_pages=body.max_pages,
        ))
        return {"status": "fetching"}
    except Exception as e:
        log.error(f"JJIT fetch failed: {e}")
        return {"error": str(e)}


@router.get("/jobs/fetch/status")
def debug_jobs_fetch_status():
    """Check JJIT fetch progress."""
    return get_fetch_status()


@router.get("/jobs/offers")
def debug_jobs_offers(
    experience_level: str | None = None,
    skill: list[str] | None = None,
    workplace_type: str | None = None,
    limit: int = 30,
    offset: int = 0,
):
    """Browse cached JJIT offers with filters."""
    exp_levels = [experience_level] if experience_level else None
    return get_cached_offers(
        experience_levels=exp_levels,
        skills=skill,
        workplace_type=workplace_type,
        limit=limit,
        offset=offset,
    )


class JobScoreRequest(BaseModel):
    profile_analysis: dict
    offer_slugs: list[str] | None = None  # if None, score all cached offers
    limit: int = 12


@router.post("/jobs/score")
def debug_jobs_score(body: JobScoreRequest):
    """Score cached offers against a provided profile (no auth needed)."""
    log.info(f"Scoring offers against profile")

    # Build profile dict from analysis (same shape as scorer expects)
    profile = {
        "technologies": body.profile_analysis.get("technologies", []),
        "experience_level": body.profile_analysis.get("experience_level", ""),
        "primary_role": body.profile_analysis.get("primary_role", ""),
        "strengths": body.profile_analysis.get("strengths", []),
        "interests": body.profile_analysis.get("interests", []),
        "notable_projects": body.profile_analysis.get("notable_projects", []),
        "summary": body.profile_analysis.get("summary", ""),
    }

    # Get offers to score
    if body.offer_slugs:
        all_offers = get_cached_offers(limit=200)
        offers = [o for o in all_offers if o["slug"] in body.offer_slugs]
    else:
        # Derive skills from profile for filtering
        skills = [t["name"] for t in profile.get("technologies", [])[:8]]
        offers = get_cached_offers(skills=skills, limit=body.limit * 2)

    if not offers:
        return {"scored": [], "message": "No matching offers found. Fetch offers first."}

    # Cap at limit
    offers = offers[:body.limit]

    try:
        # Strip to compact form for scoring
        compact = [
            {
                "slug": o["slug"],
                "title": o["title"],
                "company_name": o.get("company_name"),
                "required_skills": o.get("required_skills", []),
                "nice_to_have_skills": o.get("nice_to_have_skills", []),
                "experience_level": o.get("experience_level"),
                "workplace_type": o.get("workplace_type"),
                "salary_display": o.get("salary_display"),
                "city": o.get("city"),
            }
            for o in offers
        ]
        scored = score_offers_against_profile(profile, compact)

        # Merge score data back with full offer info
        score_by_slug = {s["slug"]: s for s in scored}
        results = []
        for o in offers:
            s = score_by_slug.get(o["slug"])
            if s:
                results.append({"offer": o, **s})

        results.sort(key=lambda x: x.get("overall_score", 0), reverse=True)
        return {"scored": results}
    except Exception as e:
        log.error(f"Scoring failed: {e}")
        return {"error": str(e)}


@router.delete("/wipe-db")
def wipe_database():
    """Drop all user data and re-initialize the database. Keeps schema intact."""
    from db import get_db, init_db
    conn = get_db()
    tables = ["offer_scores", "interviews", "job_offers", "profiles", "users",
              "jjit_offers", "fetch_state"]
    for t in tables:
        conn.execute(f"DELETE FROM {t}")
    conn.commit()
    conn.close()
    return {"ok": True, "wiped": tables}


@router.get("/logs")
async def stream_logs():
    """SSE endpoint streaming live backend logs."""
    from starlette.requests import Request
    from fastapi import Request as Req

    q = logstream.subscribe()

    async def generate():
        try:
            while True:
                try:
                    line = await asyncio.wait_for(q.get(), timeout=2)
                    yield f"data: {line}\n\n"
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        except (asyncio.CancelledError, GeneratorExit):
            pass
        finally:
            logstream.unsubscribe(q)

    return StreamingResponse(generate(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
    })
