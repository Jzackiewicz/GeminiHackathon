import json

from fastapi import APIRouter, Depends

from db import get_db
from dependencies import get_current_user
from models import JobOfferOut, JobSearchQuery, JobSelectRequest
from services.scraper import search_justjoinit

router = APIRouter(prefix="/api/jobs")


def _load_json_field(raw: str | None):
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


@router.post("/search", response_model=list[JobOfferOut])
async def search_jobs(body: JobSearchQuery, user_id: int = Depends(get_current_user)):
    results = await search_justjoinit(body.keywords, body.remote)
    db = get_db()
    saved = []
    for r in results[:10]:
        requirements = json.dumps(r.get("requiredSkills", []))
        company_insight = r.get("company_insight")
        cur = db.execute(
            """INSERT INTO job_offers (user_id, title, company, url, description, requirements, company_insight)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                user_id,
                r["title"],
                r.get("company"),
                r.get("url"),
                r.get("description"),
                requirements,
                json.dumps(company_insight) if company_insight else None,
            ),
        )
        saved.append(
            JobOfferOut(
                id=cur.lastrowid,
                title=r["title"],
                company=r.get("company"),
                url=r.get("url"),
                description=r.get("description"),
                requirements=requirements,
                company_insight=company_insight,
            )
        )
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


@router.get("", response_model=list[JobOfferOut])
def list_jobs(user_id: int = Depends(get_current_user)):
    db = get_db()
    rows = db.execute("SELECT * FROM job_offers WHERE user_id = ? ORDER BY created_at DESC", (user_id,)).fetchall()
    db.close()
    return [
        JobOfferOut(
            id=r["id"],
            title=r["title"],
            company=r["company"],
            url=r["url"],
            description=r["description"],
            requirements=r["requirements"],
            company_insight=_load_json_field(r["company_insight"]),
        )
        for r in rows
    ]
