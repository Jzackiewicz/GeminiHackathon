from pathlib import Path
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from db import init_db
from routes import auth, profile, jobs, interview, cv, debug
from services import logstream


@asynccontextmanager
async def lifespan(app: FastAPI):
    logstream.setup()
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

app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(jobs.router)
app.include_router(interview.router)
app.include_router(cv.router)
app.include_router(debug.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


# Serve static frontend files if they exist (for Docker deployment)
frontend_dist = Path(__file__).parent / "dist"
if frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=frontend_dist / "assets"), name="assets")

    @app.get("/{catchall:path}")
    async def serve_spa(catchall: str):
        # Don't intercept API routes
        if catchall.startswith("api/"):
            return {"detail": "Not Found"}
            
        file_path = frontend_dist / catchall
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
            
        # Fallback to React index.html for client-side routing
        return FileResponse(frontend_dist / "index.html")
