import json

from fastapi import APIRouter, Depends, HTTPException

from db import get_db
from dependencies import get_current_user
from pydantic import BaseModel
from models import InterviewSave, InterviewOut


class InterviewUpdateReview(BaseModel):
    review: dict
    score: int | None = None

router = APIRouter(prefix="/api/interviews")


@router.post("", response_model=InterviewOut)
def save_interview(body: InterviewSave, user_id: int = Depends(get_current_user)):
    db = get_db()
    cur = db.execute(
        """INSERT INTO interviews (user_id, mode, job_title, company, requirements, transcript, review, score)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            user_id,
            body.mode,
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
