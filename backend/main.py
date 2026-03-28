import json
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware

from db import get_db, init_db
from auth import hash_password, verify_password, create_access_token, decode_token
from models import UserCreate, UserOut, Token, ProfileOut, GitHubConnect, JobOfferOut, JobSearchQuery, JobSelectRequest, InterviewOut
from scraper import fetch_github_profile, search_justjoinit


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="InterviewAI", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Auth dependency ---

def get_current_user(authorization: str = Header(None)) -> int:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    user_id = decode_token(authorization.removeprefix("Bearer ").strip())
    if user_id is None:
        raise HTTPException(401, "Invalid token")
    return user_id


# --- Auth routes ---

@app.post("/api/auth/register", response_model=Token)
def register(body: UserCreate):
    db = get_db()
    try:
        db.execute("INSERT INTO users (email, password_hash) VALUES (?, ?)", (body.email, hash_password(body.password)))
        db.commit()
        user_id = db.execute("SELECT id FROM users WHERE email = ?", (body.email,)).fetchone()["id"]
        db.execute("INSERT INTO profiles (user_id) VALUES (?)", (user_id,))
        db.commit()
    except Exception:
        raise HTTPException(409, "Email already registered")
    finally:
        db.close()
    return Token(access_token=create_access_token(user_id))


@app.post("/api/auth/login", response_model=Token)
def login(body: UserCreate):
    db = get_db()
    row = db.execute("SELECT id, password_hash FROM users WHERE email = ?", (body.email,)).fetchone()
    db.close()
    if not row or not verify_password(body.password, row["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    return Token(access_token=create_access_token(row["id"]))


@app.get("/api/auth/me", response_model=UserOut)
def me(user_id: int = Depends(get_current_user)):
    db = get_db()
    row = db.execute("SELECT id, email FROM users WHERE id = ?", (user_id,)).fetchone()
    db.close()
    if not row:
        raise HTTPException(404)
    return UserOut(id=row["id"], email=row["email"])


# --- Profile routes ---

@app.get("/api/profile", response_model=ProfileOut)
def get_profile(user_id: int = Depends(get_current_user)):
    db = get_db()
    row = db.execute("SELECT * FROM profiles WHERE user_id = ?", (user_id,)).fetchone()
    db.close()
    if not row:
        raise HTTPException(404)
    techs = json.loads(row["technologies"]) if row["technologies"] else []
    return ProfileOut(github_username=row["github_username"], technologies=techs, summary=row["summary"])


@app.post("/api/profile/github", response_model=ProfileOut)
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


# --- Job routes ---

@app.post("/api/jobs/search", response_model=list[JobOfferOut])
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


@app.post("/api/jobs/select")
def select_job(body: JobSelectRequest, user_id: int = Depends(get_current_user)):
    db = get_db()
    db.execute("UPDATE job_offers SET selected = 0 WHERE user_id = ?", (user_id,))
    db.execute("UPDATE job_offers SET selected = 1 WHERE id = ? AND user_id = ?", (body.job_offer_id, user_id))
    db.commit()
    db.close()
    return {"ok": True}


@app.get("/api/jobs", response_model=list[JobOfferOut])
def list_jobs(user_id: int = Depends(get_current_user)):
    db = get_db()
    rows = db.execute("SELECT * FROM job_offers WHERE user_id = ? ORDER BY created_at DESC", (user_id,)).fetchall()
    db.close()
    return [JobOfferOut(id=r["id"], title=r["title"], company=r["company"], url=r["url"], description=r["description"], requirements=r["requirements"]) for r in rows]


# --- Interview routes (stubs) ---

@app.post("/api/interview/start", response_model=InterviewOut)
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


@app.get("/api/interviews", response_model=list[InterviewOut])
def list_interviews(user_id: int = Depends(get_current_user)):
    db = get_db()
    rows = db.execute("SELECT * FROM interviews WHERE user_id = ? ORDER BY created_at DESC", (user_id,)).fetchall()
    db.close()
    return [InterviewOut(id=r["id"], job_offer_id=r["job_offer_id"], vapi_call_id=r["vapi_call_id"], transcript=r["transcript"], score=r["score"], feedback=r["feedback"]) for r in rows]


# --- Health ---

@app.get("/api/health")
def health():
    return {"status": "ok"}
