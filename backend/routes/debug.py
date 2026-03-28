import asyncio
import json
import logging

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from services.scraper import deep_scrape_github
from services.prompts import get_prompt
from services import logstream

router = APIRouter(prefix="/api/debug")
log = logging.getLogger("debug")


@router.get("/scrape/{username}")
async def debug_scrape(username: str):
    """Scrape a GitHub user and return what would be sent to Gemini."""
    log.info(f"Starting deep scrape for {username}")
    github_data = await deep_scrape_github(username)
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


@router.get("/logs")
async def stream_logs():
    """SSE endpoint streaming live backend logs."""
    q = logstream.subscribe()

    async def generate():
        try:
            while True:
                try:
                    line = await asyncio.wait_for(q.get(), timeout=15)
                    yield f"data: {line}\n\n"
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            logstream.unsubscribe(q)

    return StreamingResponse(generate(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
    })
