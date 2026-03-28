import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from db import get_db
from dependencies import get_current_user
from services.stitch import start_generation, get_job


class CVGenerateRequest(BaseModel):
    job_title: str | None = None
    company: str | None = None
    requirements: str | None = None


router = APIRouter(prefix="/api/cv")


@router.post("/generate")
async def generate_cv(
    body: CVGenerateRequest | None = None,
    user_id: int = Depends(get_current_user),
):
    """Start CV generation using user's profile data from DB."""
    db = get_db()
    profile = db.execute("SELECT * FROM profiles WHERE user_id = ?", (user_id,)).fetchone()
    db.close()

    if not profile or not profile["experience_level"]:
        raise HTTPException(400, "Profile analysis not ready yet — connect GitHub first")

    # Build profile_analysis dict from DB fields
    techs_raw = json.loads(profile["technologies"]) if profile["technologies"] else []
    profile_analysis = {
        "summary": profile["summary"] or "",
        "experience_level": profile["experience_level"] or "",
        "primary_role": profile["primary_role"] or "",
        "technologies": techs_raw,
        "strengths": json.loads(profile["strengths"]) if profile["strengths"] else [],
        "interests": json.loads(profile["interests"]) if profile["interests"] else [],
        "notable_projects": json.loads(profile["notable_projects"]) if profile["notable_projects"] else [],
    }

    # Parse raw GitHub data if available
    github_data = None
    if profile["github_raw"]:
        try:
            github_data = json.loads(profile["github_raw"])
        except (json.JSONDecodeError, TypeError):
            pass

    job_title = body.job_title if body else None
    company = body.company if body else None
    requirements = body.requirements if body else None

    try:
        job_id = await start_generation(
            github_data=github_data,
            profile_analysis=profile_analysis,
            job_title=job_title,
            company=company,
            requirements=requirements,
        )
        return {"job_id": job_id}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/status/{job_id}")
def cv_status(job_id: str):
    """Poll for CV generation status."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job
