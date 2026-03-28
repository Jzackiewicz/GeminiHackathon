import asyncio
import json
import logging
import time

import httpx

from db import get_db

logger = logging.getLogger(__name__)

JJIT_LIST_URL = "https://justjoin.it/api/candidate-api/offers"
JJIT_DETAIL_URL = "https://justjoin.it/api/candidate-api/offers/{slug}"
JJIT_COUNT_URL = "https://api.justjoin.it/v2/user-panel/offers/count"
PAGE_DELAY = 1.5  # seconds between paginated requests
FETCH_COOLDOWN = 600  # 10 minutes

_fetch_lock = asyncio.Lock()


def _format_salary(employment_types: list[dict] | None) -> str | None:
    """Format the first available salary range into a display string."""
    if not employment_types:
        return None
    for et in employment_types:
        from_val = et.get("from") or et.get("fromPln")
        to_val = et.get("to") or et.get("toPln")
        if from_val and to_val:
            currency = (et.get("currency") or "PLN").upper()
            contract = et.get("type", "")
            return f"{int(from_val)}-{int(to_val)} {currency}/{et.get('unit', 'month')} {contract}".strip()
    return None


def _set_fetch_state(status: str, total: int = 0):
    db = get_db()
    db.execute(
        "INSERT OR REPLACE INTO fetch_state (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
        ("jjit_status", json.dumps({"status": status, "total": total})),
    )
    db.commit()
    db.close()


def get_fetch_status() -> dict:
    db = get_db()
    row = db.execute("SELECT value, updated_at FROM fetch_state WHERE key = 'jjit_status'").fetchone()
    total = db.execute("SELECT COUNT(*) as cnt FROM jjit_offers").fetchone()["cnt"]
    db.close()
    if not row:
        return {"status": "idle", "total_offers": total, "last_fetched_at": None}
    data = json.loads(row["value"])
    return {
        "status": data.get("status", "idle"),
        "total_offers": total,
        "last_fetched_at": row["updated_at"],
    }


def _should_fetch() -> bool:
    """Check if enough time has passed since last fetch."""
    db = get_db()
    row = db.execute("SELECT updated_at FROM fetch_state WHERE key = 'jjit_status'").fetchone()
    db.close()
    if not row:
        return True
    # Parse the timestamp and check cooldown
    from datetime import datetime, timezone
    try:
        last = datetime.fromisoformat(row["updated_at"].replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        return (now - last).total_seconds() > FETCH_COOLDOWN
    except Exception:
        return True


def _upsert_offer(db, offer: dict):
    """Insert or update a single JJIT offer in the cache."""
    skills = offer.get("requiredSkills", [])
    # List view has skill names as strings; detail view has dicts with 'name' key
    if skills and isinstance(skills[0], dict):
        skill_names = [s.get("name", "") for s in skills]
    else:
        skill_names = skills

    nice = offer.get("niceToHaveSkills") or []
    if nice and isinstance(nice[0], dict):
        nice_names = [s.get("name", "") for s in nice]
    else:
        nice_names = nice

    db.execute(
        """INSERT OR REPLACE INTO jjit_offers
        (slug, guid, title, company_name, required_skills, nice_to_have_skills,
         experience_level, workplace_type, working_time, employment_types,
         category_id, city, published_at, expired_at, raw_json, fetched_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)""",
        (
            offer.get("slug"),
            offer.get("guid"),
            offer.get("title", ""),
            offer.get("companyName"),
            json.dumps(skill_names),
            json.dumps(nice_names),
            offer.get("experienceLevel"),
            offer.get("workplaceType"),
            offer.get("workingTime"),
            json.dumps(offer.get("employmentTypes", [])),
            offer.get("categoryId") or (offer.get("category", {}) or {}).get("key"),
            offer.get("city"),
            offer.get("publishedAt"),
            offer.get("expiredAt"),
            json.dumps(offer),
        ),
    )


async def fetch_and_store_offers(
    skills: list[str] | None = None,
    experience_levels: list[str] | None = None,
    workplace_type: str | None = None,
    max_pages: int = 10,
):
    """Fetch offers from JustJoinIT candidate API and store in the local cache.

    Uses cursor-based pagination. Runs with a lock to prevent concurrent fetches.
    The candidate API doesn't support server-side skill/experience filtering,
    so we fetch broadly and filter locally in get_cached_offers.
    """
    if _fetch_lock.locked():
        logger.info("[jjit] Fetch already in progress, skipping")
        return

    async with _fetch_lock:
        _set_fetch_state("fetching")
        total_stored = 0

        try:
            cursor = None
            headers = {"Accept": "application/json"}

            async with httpx.AsyncClient(timeout=20) as client:
                for page_num in range(1, max_pages + 1):
                    params = {}
                    if cursor is not None:
                        params["cursor"] = cursor

                    resp = await client.get(JJIT_LIST_URL, headers=headers, params=params)
                    resp.raise_for_status()
                    data = resp.json()

                    offers = data.get("data", [])
                    if not offers:
                        break

                    db = get_db()
                    for offer in offers:
                        _upsert_offer(db, offer)
                    db.commit()
                    total_stored += len(offers)
                    db.close()

                    meta = data.get("meta", {})
                    next_info = meta.get("next") or {}
                    cursor = next_info.get("cursor")

                    logger.info(f"[jjit] Page {page_num}: stored {len(offers)} offers (total: {total_stored}/{meta.get('totalItems', '?')})")

                    if cursor is None:
                        break

                    await asyncio.sleep(PAGE_DELAY)

            _set_fetch_state("done", total_stored)
            logger.info(f"[jjit] Fetch complete: {total_stored} offers stored")

        except Exception as e:
            logger.error(f"[jjit] Fetch failed: {e}")
            _set_fetch_state("error", total_stored)
            raise


async def fetch_offer_detail(slug: str) -> dict | None:
    """Fetch full offer detail from the candidate API and cache it."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            JJIT_DETAIL_URL.format(slug=slug),
            headers={"Accept": "application/json"},
        )
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        detail = resp.json()

    db = get_db()
    db.execute(
        """UPDATE jjit_offers SET
            body_html = ?, company_url = ?, company_size = ?,
            apply_url = ?, languages = ?
        WHERE slug = ?""",
        (
            detail.get("body"),
            detail.get("companyUrl"),
            detail.get("companySize"),
            detail.get("applyUrl"),
            json.dumps(detail.get("languages", [])),
            slug,
        ),
    )
    db.commit()
    db.close()
    return detail


def get_cached_offers(
    experience_levels: list[str] | None = None,
    skills: list[str] | None = None,
    workplace_type: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[dict]:
    """Query cached JJIT offers with optional filters."""
    db = get_db()
    conditions = []
    params = []

    if experience_levels:
        placeholders = ",".join("?" * len(experience_levels))
        conditions.append(f"experience_level IN ({placeholders})")
        params.extend(experience_levels)

    if workplace_type:
        conditions.append("workplace_type = ?")
        params.append(workplace_type)

    where = ""
    if conditions:
        where = "WHERE " + " AND ".join(conditions)

    rows = db.execute(
        f"SELECT * FROM jjit_offers {where} ORDER BY published_at DESC LIMIT ? OFFSET ?",
        params + [limit, offset],
    ).fetchall()
    db.close()

    results = []
    for r in rows:
        req_skills = json.loads(r["required_skills"]) if r["required_skills"] else []
        nice_skills = json.loads(r["nice_to_have_skills"]) if r["nice_to_have_skills"] else []
        emp_types = json.loads(r["employment_types"]) if r["employment_types"] else []

        # If skill filter provided, check overlap
        if skills:
            offer_skills_lower = {s.lower() for s in req_skills + nice_skills}
            if not any(s.lower() in offer_skills_lower for s in skills):
                continue

        results.append({
            "slug": r["slug"],
            "guid": r["guid"],
            "title": r["title"],
            "company_name": r["company_name"],
            "required_skills": req_skills,
            "nice_to_have_skills": nice_skills,
            "experience_level": r["experience_level"],
            "workplace_type": r["workplace_type"],
            "working_time": r["working_time"],
            "salary_display": _format_salary(emp_types),
            "city": r["city"],
            "published_at": r["published_at"],
            "url": f"https://justjoin.it/job-offer/{r['slug']}",
        })

    return results
