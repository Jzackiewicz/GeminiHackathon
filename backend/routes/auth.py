import json

from fastapi import APIRouter, Depends, HTTPException

from db import get_db
from dependencies import get_current_user
from models import UserCreate, UserOut, Token, GitHubCallbackRequest
from services.auth import (
    hash_password,
    verify_password,
    create_access_token,
    exchange_github_code,
    GITHUB_CLIENT_ID,
)

router = APIRouter(prefix="/api/auth")


@router.post("/register", response_model=Token)
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


@router.post("/login", response_model=Token)
def login(body: UserCreate):
    db = get_db()
    row = db.execute("SELECT id, password_hash FROM users WHERE email = ?", (body.email,)).fetchone()
    db.close()
    if not row or not verify_password(body.password, row["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    return Token(access_token=create_access_token(row["id"]))


@router.get("/github/client-id")
def github_client_id():
    return {"client_id": GITHUB_CLIENT_ID}


@router.post("/github/callback", response_model=Token)
async def github_callback(body: GitHubCallbackRequest):
    try:
        gh_user = await exchange_github_code(body.code)
    except (ValueError, Exception) as e:
        raise HTTPException(401, str(e))
    db = get_db()
    row = db.execute("SELECT id FROM users WHERE github_id = ?", (gh_user["github_id"],)).fetchone()
    if row:
        user_id = row["id"]
    else:
        row = db.execute("SELECT id FROM users WHERE email = ?", (gh_user["email"],)).fetchone()
        if row:
            user_id = row["id"]
            db.execute("UPDATE users SET github_id = ? WHERE id = ?", (gh_user["github_id"], user_id))
        else:
            db.execute(
                "INSERT INTO users (email, github_id) VALUES (?, ?)",
                (gh_user["email"], gh_user["github_id"]),
            )
            db.commit()
            user_id = db.execute("SELECT id FROM users WHERE github_id = ?", (gh_user["github_id"],)).fetchone()["id"]
            db.execute(
                "INSERT INTO profiles (user_id, github_username) VALUES (?, ?)",
                (user_id, gh_user["login"]),
            )
        db.commit()
    # Always update the token (it may have been refreshed)
    db.execute("UPDATE users SET github_token = ? WHERE id = ?", (gh_user["access_token"], user_id))
    db.commit()
    db.close()
    return Token(access_token=create_access_token(user_id))


@router.get("/me", response_model=UserOut)
def me(user_id: int = Depends(get_current_user)):
    db = get_db()
    row = db.execute("SELECT id, email FROM users WHERE id = ?", (user_id,)).fetchone()
    db.close()
    if not row:
        raise HTTPException(404)
    return UserOut(id=row["id"], email=row["email"])
