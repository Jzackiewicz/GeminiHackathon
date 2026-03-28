import asyncio
import json
import logging
import os

from fastapi import APIRouter, Header
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from db import get_db
from dependencies import get_current_user
from services.scraper import deep_scrape_github
from services.llm import analyze_github_profile
from services.vapi import create_interview_assistant, create_job_discovery_assistant, delete_assistant
from services.prompts import get_prompt
from services import logstream

router = APIRouter(prefix="/api/debug")
log = logging.getLogger("debug")


@router.get("/scrape/{username}")
async def debug_scrape(username: str, authorization: str = Header(None)):
    """Scrape a GitHub user and return what would be sent to Gemini."""
    # Try to use the logged-in user's GitHub token for private repo access
    token = None
    if authorization and authorization.startswith("Bearer "):
        from services.auth import decode_token
        user_id = decode_token(authorization.removeprefix("Bearer ").strip())
        if user_id:
            db = get_db()
            row = db.execute("SELECT github_token FROM users WHERE id = ?", (user_id,)).fetchone()
            db.close()
            if row and row["github_token"]:
                token = row["github_token"]
                log.info(f"Using OAuth token for {username} (private repos included)")

    log.info(f"Starting deep scrape for {username}")
    github_data = await deep_scrape_github(username, token=token)
    log.info(f"Scrape complete: {len(github_data.get('repos', []))} repos, {len(github_data.get('languages', {}))} languages")
    context = json.dumps(github_data, indent=2, default=str)
    system_prompt = get_prompt("profile_analysis", "system")
    user_prompt = get_prompt("profile_analysis", "user")

    return {
        "github_data": github_data,
        "gemini_payload": {
            "system": system_prompt,
            "user": f"<context>\n{context}\n</context>\n\n{user_prompt}",
            "estimated_tokens": len(context) // 4,
        },
    }


@router.post("/analyze")
async def debug_analyze(body: dict):
    """Run Gemini analysis on previously scraped GitHub data."""
    log.info("Starting Gemini profile analysis")
    try:
        result = analyze_github_profile(body)
        log.info(f"Gemini analysis complete: {result.get('experience_level')} {result.get('primary_role')}")
        return {"analysis": result}
    except Exception as e:
        log.error(f"Gemini analysis failed: {e}")
        return {"error": str(e)}


class VapiTestRequest(BaseModel):
    mode: str = "interview"  # "interview" or "job_discovery"
    user_name: str = "Test User"
    technologies: list[str] = ["Python", "JavaScript"]
    summary: str = "Experienced developer"
    job_title: str = "Senior Backend Developer"
    company: str | None = "Test Corp"
    requirements: str | None = "Python, FastAPI, PostgreSQL"


@router.get("/vapi/config")
def vapi_config():
    """Return VAPI public key for frontend SDK."""
    return {"public_key": os.getenv("VAPI_PUBLIC_KEY", "")}


@router.post("/vapi/assistant")
def create_test_assistant(body: VapiTestRequest):
    """Create a temporary VAPI assistant for testing."""
    log.info(f"Creating VAPI {body.mode} assistant for {body.user_name}")
    try:
        if body.mode == "job_discovery":
            assistant_id = create_job_discovery_assistant(
                user_name=body.user_name,
                technologies=body.technologies,
                summary=body.summary,
            )
        else:
            assistant_id = create_interview_assistant(
                user_name=body.user_name,
                technologies=body.technologies,
                summary=body.summary,
                job_title=body.job_title,
                company=body.company,
                requirements=body.requirements,
            )
        log.info(f"VAPI assistant created: {assistant_id}")
        return {"assistant_id": assistant_id}
    except Exception as e:
        log.error(f"VAPI assistant creation failed: {e}")
        return {"error": str(e)}


@router.delete("/vapi/assistant/{assistant_id}")
def cleanup_assistant(assistant_id: str):
    """Delete a test assistant."""
    try:
        delete_assistant(assistant_id)
        log.info(f"VAPI assistant deleted: {assistant_id}")
        return {"ok": True}
    except Exception as e:
        log.error(f"VAPI assistant deletion failed: {e}")
        return {"error": str(e)}


class ChatMessage(BaseModel):
    assistant_id: str
    messages: list[dict]  # full conversation history


@router.post("/vapi/chat")
async def vapi_chat(body: ChatMessage):
    """Text-only chat with a VAPI assistant. Sends full message history for context."""
    import httpx
    api_key = os.getenv("VAPI_API_KEY")
    if not api_key:
        return {"error": "VAPI_API_KEY not set"}

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.vapi.ai/chat",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "assistantId": body.assistant_id,
                "input": body.messages,
            },
        )
        if resp.status_code != 200 and resp.status_code != 201:
            return {"error": f"VAPI API error: {resp.status_code} {resp.text[:200]}"}

        data = resp.json()
        return {
            "output": data.get("output", []),
        }


@router.get("/logs")
async def stream_logs():
    """SSE endpoint streaming live backend logs."""
    from starlette.requests import Request
    from fastapi import Request as Req

    q = logstream.subscribe()

    async def generate():
        try:
            while True:
                try:
                    line = await asyncio.wait_for(q.get(), timeout=2)
                    yield f"data: {line}\n\n"
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        except (asyncio.CancelledError, GeneratorExit):
            pass
        finally:
            logstream.unsubscribe(q)

    return StreamingResponse(generate(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
    })
