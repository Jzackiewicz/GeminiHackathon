import json

from fastapi import APIRouter, Depends, HTTPException

from db import get_db
from dependencies import get_current_user
from models import JobOfferOut, JobSearchQuery, JobSelectRequest
from services.scraper import search_justjoinit

router = APIRouter(prefix="/api/jobs")


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


@router.get("", response_model=list[JobOfferOut])
def list_jobs(user_id: int = Depends(get_current_user)):
    db = get_db()
    rows = db.execute("SELECT * FROM job_offers WHERE user_id = ? ORDER BY created_at DESC", (user_id,)).fetchall()
    db.close()
    return [JobOfferOut(id=r["id"], title=r["title"], company=r["company"], url=r["url"], description=r["description"], requirements=r["requirements"]) for r in rows]
