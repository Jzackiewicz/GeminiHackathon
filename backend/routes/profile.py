import json
import asyncio
import traceback

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks

from db import get_db
from dependencies import get_current_user
from models import ProfileOut, TechnologyDetail, NotableProject, GitHubConnect
from services.scraper import fetch_github_profile, deep_scrape_github
from services.llm import analyze_github_profile

router = APIRouter(prefix="/api/profile")


def _profile_from_row(row) -> ProfileOut:
    techs_raw = json.loads(row["technologies"]) if row["technologies"] else []
    # Handle both old format (list of strings) and new format (list of dicts)
    technologies = []
    for t in techs_raw:
        if isinstance(t, dict):
            technologies.append(TechnologyDetail(**t))
        else:
            technologies.append(TechnologyDetail(name=t, category="language", proficiency="unknown"))

    strengths = json.loads(row["strengths"]) if row["strengths"] else []
    interests = json.loads(row["interests"]) if row["interests"] else []
    notable = json.loads(row["notable_projects"]) if row["notable_projects"] else []
    notable_projects = [NotableProject(**p) for p in notable]

    return ProfileOut(
        github_username=row["github_username"],
        technologies=technologies,
        summary=row["summary"],
        experience_level=row["experience_level"],
        primary_role=row["primary_role"],
        strengths=strengths,
        interests=interests,
        notable_projects=notable_projects,
        analysis_ready=row["experience_level"] is not None,
    )


@router.get("", response_model=ProfileOut)
def get_profile(user_id: int = Depends(get_current_user)):
    db = get_db()
    row = db.execute("SELECT * FROM profiles WHERE user_id = ?", (user_id,)).fetchone()
    db.close()
    if not row:
        raise HTTPException(404)
    return _profile_from_row(row)


def _get_github_token(user_id: int) -> str | None:
    db = get_db()
    row = db.execute("SELECT github_token FROM users WHERE id = ?", (user_id,)).fetchone()
    db.close()
    return row["github_token"] if row and row["github_token"] else None


def _run_deep_analysis(user_id: int, username: str):
    """Background task: deep scrape GitHub + Gemini analysis."""
    try:
        token = _get_github_token(user_id)
        github_data = asyncio.run(deep_scrape_github(username, token=token))
        analysis = analyze_github_profile(github_data)

        db = get_db()
        db.execute(
            """UPDATE profiles SET
                technologies = ?,
                summary = ?,
                experience_level = ?,
                primary_role = ?,
                strengths = ?,
                interests = ?,
                notable_projects = ?,
                github_raw = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?""",
            (
                json.dumps([t if isinstance(t, dict) else t for t in analysis.get("technologies", [])]),
                analysis.get("summary", ""),
                analysis.get("experience_level"),
                analysis.get("primary_role"),
                json.dumps(analysis.get("strengths", [])),
                json.dumps(analysis.get("interests", [])),
                json.dumps(analysis.get("notable_projects", [])),
                json.dumps(github_data, default=str),
                user_id,
            ),
        )
        db.commit()
        db.close()
        print(f"[profile] Deep analysis complete for user {user_id} ({username})")
    except Exception:
        traceback.print_exc()


@router.post("/github", response_model=ProfileOut)
async def connect_github(
    body: GitHubConnect,
    background_tasks: BackgroundTasks,
    user_id: int = Depends(get_current_user),
):
    # Quick scrape for immediate feedback
    token = _get_github_token(user_id)
    gh = await fetch_github_profile(body.username, token=token)
    techs = json.dumps(gh["languages"])
    summary = f"{gh.get('name') or body.username} — {gh.get('bio') or 'No bio'}. {gh['public_repos']} public repos. Top languages: {', '.join(gh['languages'][:5])}"

    db = get_db()
    db.execute(
        "UPDATE profiles SET github_username = ?, technologies = ?, summary = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
        (body.username, techs, summary, user_id),
    )
    db.commit()
    db.close()

    # Kick off deep analysis in background
    background_tasks.add_task(_run_deep_analysis, user_id, body.username)

    return ProfileOut(
        github_username=body.username,
        technologies=[TechnologyDetail(name=l, category="language", proficiency="unknown") for l in gh["languages"]],
        summary=summary,
        analysis_ready=False,
    )
