from fastapi import APIRouter, Depends, HTTPException

from db import get_db
from dependencies import get_current_user
from models import InterviewOut

router = APIRouter(prefix="/api")


@router.post("/interview/start", response_model=InterviewOut)
def start_interview(user_id: int = Depends(get_current_user)):
    db = get_db()
    job = db.execute("SELECT id FROM job_offers WHERE user_id = ? AND selected = 1", (user_id,)).fetchone()
    if not job:
        db.close()
        raise HTTPException(400, "Select a job offer first")
    cur = db.execute("INSERT INTO interviews (user_id, job_offer_id) VALUES (?, ?)", (user_id, job["id"]))
    db.commit()
    interview_id = cur.lastrowid
    db.close()
    # TODO: create VAPI call and set vapi_call_id
    return InterviewOut(id=interview_id, job_offer_id=job["id"])


@router.get("/interviews", response_model=list[InterviewOut])
def list_interviews(user_id: int = Depends(get_current_user)):
    db = get_db()
    rows = db.execute("SELECT * FROM interviews WHERE user_id = ? ORDER BY created_at DESC", (user_id,)).fetchall()
    db.close()
    return [InterviewOut(id=r["id"], job_offer_id=r["job_offer_id"], vapi_call_id=r["vapi_call_id"], transcript=r["transcript"], score=r["score"], feedback=r["feedback"]) for r in rows]
