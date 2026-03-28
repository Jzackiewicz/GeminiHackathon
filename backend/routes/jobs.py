import json
import asyncio
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query

from db import get_db
from dependencies import get_current_user
from models import (
    FetchStatusOut,
    JJITOfferOut,
    JobOfferOut,
    JobSearchQuery,
    JobSelectRequest,
    OfferDetailOut,
    ScoreFilters,
    ScoredOfferOut,
    Suggestion,
)
from services.jjit import (
    fetch_and_store_offers,
    fetch_offer_detail,
    get_cached_offers,
    get_fetch_status,
    _format_salary,
)
from services.scorer import aggregate_suggestions, build_scoring_profile, get_scored_offers
from services.scraper import search_justjoinit

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/jobs")


# ---------------------------------------------------------------------------
# Existing endpoints (unchanged)
# ---------------------------------------------------------------------------

@router.post("/search", response_model=list[JobOfferOut])
async def search_jobs(body: JobSearchQuery, user_id: int = Depends(get_current_user)):
    results = await search_justjoinit(body.keywords, body.remote)
    db = get_db()
    saved = []
    for r in results[:10]:
        cur = db.execute(
            "INSERT INTO job_offers (user_id, title, company, url, requirements) VALUES (?, ?, ?, ?, ?)",
            (user_id, r["title"], r.get("company"), r.get("url"), json.dumps(r.get("requiredSkills", []))),
        )
        saved.append(JobOfferOut(id=cur.lastrowid, title=r["title"], company=r.get("company"), url=r.get("url"), requirements=json.dumps(r.get("requiredSkills", []))))
    db.commit()
    db.close()
    return saved


@router.post("/select")
def select_job(body: JobSelectRequest, user_id: int = Depends(get_current_user)):
    db = get_db()
    db.execute("UPDATE job_offers SET selected = 0 WHERE user_id = ?", (user_id,))
    db.execute("UPDATE job_offers SET selected = 1 WHERE id = ? AND user_id = ?", (body.job_offer_id, user_id))
    db.commit()
    db.close()
    return {"ok": True}


@router.get("/selected")
def get_selected_job(user_id: int = Depends(get_current_user)):
    db = get_db()
    row = db.execute(
        "SELECT * FROM job_offers WHERE user_id = ? AND selected = 1 ORDER BY created_at DESC LIMIT 1",
        (user_id,),
    ).fetchone()
    db.close()
    if not row:
        return {"job": None}
    reqs = row["requirements"] or "[]"
    try:
        tags = json.loads(reqs) if reqs.startswith("[") else [reqs]
    except (json.JSONDecodeError, TypeError):
        tags = []
    return {
        "job": {
            "id": row["id"],
            "title": row["title"],
            "company": row["company"],
            "url": row["url"],
            "description": row["description"],
            "tags": tags if isinstance(tags, list) else [],
        }
    }


@router.get("/list", response_model=list[JobOfferOut])
def list_jobs(user_id: int = Depends(get_current_user)):
    db = get_db()
    rows = db.execute("SELECT * FROM job_offers WHERE user_id = ? ORDER BY created_at DESC", (user_id,)).fetchall()
    db.close()
    return [JobOfferOut(id=r["id"], title=r["title"], company=r["company"], url=r["url"], description=r["description"], requirements=r["requirements"]) for r in rows]


# ---------------------------------------------------------------------------
# New JJIT fetch + scoring endpoints
# ---------------------------------------------------------------------------

def _derive_filters_from_profile(user_id: int) -> dict:
    """Derive JJIT API filters from the user's profile."""
    db = get_db()
    row = db.execute("SELECT technologies, experience_level FROM profiles WHERE user_id = ?", (user_id,)).fetchone()
    db.close()

    filters = {}
    if not row:
        return filters

    if row["experience_level"]:
        level_map = {"junior": "junior", "mid": "mid", "senior": "senior", "lead": "c_level"}
        mapped = level_map.get(row["experience_level"])
        if mapped:
            filters["experience_levels"] = [mapped]

    if row["technologies"]:
        try:
            techs = json.loads(row["technologies"])
            # Extract top skill names (handle both string and dict formats)
            names = []
            for t in techs[:5]:
                if isinstance(t, dict):
                    names.append(t.get("name", ""))
                else:
                    names.append(str(t))
            filters["skills"] = [n for n in names if n]
        except (json.JSONDecodeError, TypeError):
            pass

    return filters


@router.post("/fetch", response_model=FetchStatusOut)
async def trigger_fetch(
    body: ScoreFilters | None = None,
    background_tasks: BackgroundTasks = None,
    user_id: int = Depends(get_current_user),
):
    """Trigger JustJoinIT offer fetching in the background.

    Uses profile-derived filters if no explicit filters provided.
    """
    status = get_fetch_status()
    if status["status"] == "fetching":
        return FetchStatusOut(**status)

    # Derive filters from profile if not explicitly provided
    if body and (body.skills or body.experience_levels):
        skills = body.skills
        experience_levels = body.experience_levels
        workplace_type = body.workplace_type
    else:
        derived = _derive_filters_from_profile(user_id)
        skills = derived.get("skills")
        experience_levels = derived.get("experience_levels")
        workplace_type = body.workplace_type if body else None

    async def _bg_fetch():
        await fetch_and_store_offers(
            skills=skills,
            experience_levels=experience_levels,
            workplace_type=workplace_type,
        )

    asyncio.ensure_future(_bg_fetch())

    return FetchStatusOut(status="fetching", total_offers=status.get("total_offers", 0))


@router.get("/fetch/status", response_model=FetchStatusOut)
def fetch_status():
    """Check current fetch status."""
    status = get_fetch_status()
    return FetchStatusOut(**status)


@router.get("/scored", response_model=list[ScoredOfferOut])
def scored_offers(
    user_id: int = Depends(get_current_user),
    experience_level: str | None = Query(None),
    skill: list[str] | None = Query(None),
    workplace_type: str | None = Query(None),
    limit: int = Query(20, le=50),
):
    """Get scored offers for the current user.

    Triggers on-demand scoring for unscored offers.
    """
    profile, _ = build_scoring_profile(user_id)
    if not profile.get("technologies"):
        raise HTTPException(409, "Profile not ready — connect GitHub first and wait for analysis")

    exp_levels = [experience_level] if experience_level else None

    results = get_scored_offers(
        user_id=user_id,
        experience_levels=exp_levels,
        skills=skill,
        workplace_type=workplace_type,
        limit=limit,
    )

    return results


@router.get("/suggestions", response_model=list[Suggestion])
def top_suggestions(user_id: int = Depends(get_current_user)):
    """Get aggregated improvement suggestions across top scored offers."""
    return aggregate_suggestions(user_id)


@router.get("/offers", response_model=list[JJITOfferOut])
def browse_offers(
    experience_level: str | None = Query(None),
    skill: list[str] | None = Query(None),
    workplace_type: str | None = Query(None),
    limit: int = Query(25, le=100),
    offset: int = Query(0),
):
    """Browse cached JJIT offers (no scoring, no auth required for browsing)."""
    exp_levels = [experience_level] if experience_level else None
    offers = get_cached_offers(
        experience_levels=exp_levels,
        skills=skill,
        workplace_type=workplace_type,
        limit=limit,
        offset=offset,
    )
    return [JJITOfferOut(**o) for o in offers]


@router.get("/detail/{slug}")
async def offer_detail(slug: str, user_id: int = Depends(get_current_user)):
    """Get full offer detail including HTML body. Fetches from JJIT if not cached."""
    db = get_db()
    row = db.execute("SELECT * FROM jjit_offers WHERE slug = ?", (slug,)).fetchone()
    db.close()

    if not row:
        raise HTTPException(404, "Offer not found in cache")

    # Lazy-fetch detail if body not cached
    if not row["body_html"]:
        detail = await fetch_offer_detail(slug)
        if not detail:
            raise HTTPException(404, "Offer not found on JustJoinIT")
        # Re-read the updated row
        db = get_db()
        row = db.execute("SELECT * FROM jjit_offers WHERE slug = ?", (slug,)).fetchone()
        db.close()

    emp_types = json.loads(row["employment_types"]) if row["employment_types"] else []

    offer = JJITOfferOut(
        slug=row["slug"],
        title=row["title"],
        company_name=row["company_name"],
        required_skills=json.loads(row["required_skills"]) if row["required_skills"] else [],
        nice_to_have_skills=json.loads(row["nice_to_have_skills"]) if row["nice_to_have_skills"] else [],
        experience_level=row["experience_level"],
        workplace_type=row["workplace_type"],
        working_time=row["working_time"],
        salary_display=_format_salary(emp_types),
        city=row["city"],
        published_at=row["published_at"],
        url=f"https://justjoin.it/job-offer/{row['slug']}",
    )

    # Check for existing score
    db = get_db()
    score_row = db.execute(
        "SELECT * FROM offer_scores WHERE user_id = ? AND offer_slug = ? ORDER BY scored_at DESC LIMIT 1",
        (user_id, slug),
    ).fetchone()
    db.close()

    score_data = None
    if score_row:
        score_data = ScoredOfferOut(
            offer=offer,
            overall_score=score_row["overall_score"],
            skill_match=json.loads(score_row["skill_match"]) if score_row["skill_match"] else {},
            experience_fit=json.loads(score_row["experience_fit"]) if score_row["experience_fit"] else {},
            suggestions=json.loads(score_row["suggestions"]) if score_row["suggestions"] else [],
            reasoning=score_row["reasoning"] or "",
        )

    return OfferDetailOut(
        offer=offer,
        body_html=row["body_html"],
        company_url=row["company_url"],
        company_size=row["company_size"],
        apply_url=row["apply_url"],
        languages=json.loads(row["languages"]) if row["languages"] else [],
        score=score_data,
    )
