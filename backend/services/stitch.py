"""
Stitch CV generation service.

Calls the Node.js Stitch SDK via subprocess (no Python SDK available).
Runs generation in a background thread since it takes ~2 minutes.
"""
import asyncio
import json
import logging
import os
import subprocess
from pathlib import Path

log = logging.getLogger("stitch")

SCRIPT_PATH = Path(__file__).resolve().parent.parent / "stitch_generate.mjs"
# node_modules lives at repo root (one level above backend/)
NODE_MODULES = Path(__file__).resolve().parent.parent.parent / "node_modules"

# In-memory job store: job_id -> {status, result, error}
_jobs: dict[str, dict] = {}
_job_counter = 0


def _run_stitch(prompt: str, title: str) -> dict:
    """Synchronously invoke the Node.js Stitch script. Blocks for ~2 min."""
    env = {**os.environ, "NODE_PATH": str(NODE_MODULES)}
    if os.getenv("STITCH_API_KEY"):
        env["STITCH_API_KEY"] = os.getenv("STITCH_API_KEY")

    payload = json.dumps({"prompt": prompt, "title": title})
    result = subprocess.run(
        ["node", str(SCRIPT_PATH), payload],
        capture_output=True,
        text=True,
        env=env,
        timeout=300,  # 5 min hard limit
    )

    if result.returncode != 0:
        # Try to parse JSON error from stdout first
        try:
            data = json.loads(result.stdout.strip())
            if "error" in data:
                raise RuntimeError(data["error"])
        except (json.JSONDecodeError, KeyError):
            pass
        raise RuntimeError(result.stderr or f"stitch_generate.mjs exited with code {result.returncode}")

    return json.loads(result.stdout.strip())


def build_cv_prompt(
    github_data: dict | None = None,
    profile_analysis: dict | None = None,
    job_title: str | None = None,
    company: str | None = None,
    requirements: str | None = None,
) -> str:
    """Build a Stitch prompt from available user data."""
    from services.prompts import get_prompt

    # Extract name
    name = "Developer"
    if github_data:
        name = github_data.get("name") or github_data.get("username") or name

    # Extract role
    role = job_title or ""
    if not role and profile_analysis:
        role = profile_analysis.get("primary_role", "Software Developer")

    # Extract skills
    skills = []
    if profile_analysis:
        for t in profile_analysis.get("technologies", []):
            skills.append(t["name"])
    if not skills and github_data:
        skills = list((github_data.get("languages") or {}).keys())[:10]

    # Extract projects
    projects = []
    if profile_analysis:
        for p in profile_analysis.get("notable_projects", []):
            techs = ", ".join(p.get("technologies", []))
            projects.append(f"{p['name']} ({techs})" if techs else p["name"])
    if not projects and github_data:
        for r in (github_data.get("repos") or [])[:5]:
            langs = ", ".join(list((r.get("languages") or {}).keys())[:3])
            projects.append(f"{r['name']} ({langs})" if langs else r["name"])

    # Extract summary
    summary = ""
    if profile_analysis:
        summary = profile_analysis.get("summary", "")

    # Extract strengths
    strengths = []
    if profile_analysis:
        strengths = profile_analysis.get("strengths", [])

    # Extract experience level
    experience_level = ""
    if profile_analysis:
        experience_level = profile_analysis.get("experience_level", "")

    return get_prompt(
        "cv_generation",
        "prompt",
        name=name,
        role=role,
        skills=", ".join(skills) if skills else "Not specified",
        projects="; ".join(projects) if projects else "Not specified",
        summary=summary or "Not specified",
        strengths=", ".join(strengths) if strengths else "Not specified",
        experience_level=experience_level or "Not specified",
        job_title=job_title or role or "Not specified",
        company=company or "Not specified",
        requirements=requirements or ", ".join(skills[:5]) if skills else "Not specified",
    )


async def start_generation(
    github_data: dict | None = None,
    profile_analysis: dict | None = None,
    job_title: str | None = None,
    company: str | None = None,
    requirements: str | None = None,
) -> str:
    """Start async CV generation. Returns a job_id for polling."""
    global _job_counter
    _job_counter += 1
    job_id = f"cv-{_job_counter}"

    prompt = build_cv_prompt(github_data, profile_analysis, job_title, company, requirements)

    name = "Developer"
    if github_data:
        name = github_data.get("name") or github_data.get("username") or name
    title = f"CV - {name}"

    _jobs[job_id] = {"status": "generating", "prompt": prompt}
    log.info(f"[{job_id}] Starting Stitch generation for {name}")

    loop = asyncio.get_event_loop()

    async def run():
        try:
            result = await loop.run_in_executor(None, _run_stitch, prompt, title)
            if "error" in result:
                _jobs[job_id] = {"status": "error", "error": result["error"]}
                log.error(f"[{job_id}] Stitch error: {result['error']}")
            else:
                _jobs[job_id] = {
                    "status": "done",
                    "html": result.get("html"),
                    "screenshotUrl": result.get("screenshotUrl"),
                    "elapsed": result.get("elapsed"),
                }
                log.info(f"[{job_id}] Done in {result.get('elapsed')}s, {len(result.get('html', ''))} chars")
        except Exception as e:
            _jobs[job_id] = {"status": "error", "error": str(e)}
            log.error(f"[{job_id}] Generation failed: {e}")

    asyncio.create_task(run())
    return job_id


def get_job(job_id: str) -> dict | None:
    """Get the status/result of a generation job."""
    return _jobs.get(job_id)
