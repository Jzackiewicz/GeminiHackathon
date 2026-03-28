import json

from fastapi import APIRouter, Depends, HTTPException

from db import get_db
from dependencies import get_current_user
from models import ProfileOut, GitHubConnect
from services.scraper import fetch_github_profile

router = APIRouter(prefix="/api/profile")


@router.get("", response_model=ProfileOut)
def get_profile(user_id: int = Depends(get_current_user)):
    db = get_db()
    row = db.execute("SELECT * FROM profiles WHERE user_id = ?", (user_id,)).fetchone()
    db.close()
    if not row:
        raise HTTPException(404)
    techs = json.loads(row["technologies"]) if row["technologies"] else []
    return ProfileOut(github_username=row["github_username"], technologies=techs, summary=row["summary"])


@router.post("/github", response_model=ProfileOut)
async def connect_github(body: GitHubConnect, user_id: int = Depends(get_current_user)):
    gh = await fetch_github_profile(body.username)
    techs = json.dumps(gh["languages"])
    summary = f"{gh.get('name') or body.username} — {gh.get('bio') or 'No bio'}. {gh['public_repos']} public repos. Top languages: {', '.join(gh['languages'][:5])}"
    db = get_db()
    db.execute(
        "UPDATE profiles SET github_username = ?, technologies = ?, summary = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
        (body.username, techs, summary, user_id),
    )
    db.commit()
    db.close()
    return ProfileOut(github_username=body.username, technologies=gh["languages"], summary=summary)
