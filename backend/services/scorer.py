import hashlib
import json
import logging
from collections import Counter

from db import get_db
from services.llm import score_offers_against_profile

logger = logging.getLogger(__name__)

BATCH_SIZE = 12


def build_scoring_profile(user_id: int) -> tuple[dict, str]:
    """Assemble a compact profile dict from DB for scoring.

    Merges GitHub analysis fields + any stored linkedin_data.
    Returns (profile_dict, profile_hash).
    """
    db = get_db()
    row = db.execute("SELECT * FROM profiles WHERE user_id = ?", (user_id,)).fetchone()
    db.close()

    if not row:
        return {}, ""

    profile = {
        "technologies": json.loads(row["technologies"]) if row["technologies"] else [],
        "experience_level": row["experience_level"],
        "primary_role": row["primary_role"],
        "strengths": json.loads(row["strengths"]) if row["strengths"] else [],
        "interests": json.loads(row["interests"]) if row["interests"] else [],
        "notable_projects": json.loads(row["notable_projects"]) if row["notable_projects"] else [],
        "summary": row["summary"],
    }

    # Merge LinkedIn data if available
    if row["linkedin_data"]:
        try:
            linkedin = json.loads(row["linkedin_data"])
            profile["linkedin_positions"] = linkedin.get("positions", [])
            profile["linkedin_education"] = linkedin.get("education", [])
            profile["linkedin_skills"] = linkedin.get("skills", [])
            profile["linkedin_certifications"] = linkedin.get("certifications", [])
            profile["linkedin_posts"] = linkedin.get("posts", [])[:10]  # cap for token budget
            if linkedin.get("info"):
                profile["linkedin_headline"] = linkedin["info"].get("headline", "")
                profile["linkedin_summary"] = linkedin["info"].get("summary", "")
        except (json.JSONDecodeError, TypeError):
            pass

    profile_hash = hashlib.md5(json.dumps(profile, sort_keys=True).encode()).hexdigest()[:12]
    return profile, profile_hash


def _compact_offers_for_scoring(offers: list[dict]) -> list[dict]:
    """Strip offers down to fields relevant for scoring."""
    return [
        {
            "slug": o["slug"],
            "title": o["title"],
            "company_name": o.get("company_name"),
            "required_skills": o.get("required_skills", []),
            "nice_to_have_skills": o.get("nice_to_have_skills", []),
            "experience_level": o.get("experience_level"),
            "workplace_type": o.get("workplace_type"),
            "salary_display": o.get("salary_display"),
            "city": o.get("city"),
        }
        for o in offers
    ]


def score_batch(user_id: int, profile: dict, profile_hash: str, offers: list[dict]) -> list[dict]:
    """Score a batch of offers against a profile using Gemini.

    Stores results in offer_scores and returns the parsed scores.
    """
    compact = _compact_offers_for_scoring(offers)
    scored = score_offers_against_profile(profile, compact)

    db = get_db()
    for s in scored:
        try:
            db.execute(
                """INSERT OR REPLACE INTO offer_scores
                (user_id, offer_slug, overall_score, skill_match, experience_fit,
                 suggestions, reasoning, profile_hash, scored_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)""",
                (
                    user_id,
                    s["slug"],
                    s["overall_score"],
                    json.dumps(s.get("skill_match", {})),
                    json.dumps(s.get("experience_fit", {})),
                    json.dumps(s.get("suggestions", [])),
                    s.get("reasoning", ""),
                    profile_hash,
                ),
            )
        except Exception as e:
            logger.warning(f"[scorer] Failed to store score for {s.get('slug')}: {e}")
    db.commit()
    db.close()

    return scored


def get_scored_offers(
    user_id: int,
    experience_levels: list[str] | None = None,
    skills: list[str] | None = None,
    workplace_type: str | None = None,
    limit: int = 20,
) -> list[dict]:
    """Get scored offers for a user. Scores unscored offers on demand."""
    from services.jjit import get_cached_offers

    profile, profile_hash = build_scoring_profile(user_id)
    if not profile.get("technologies"):
        return []

    # Get candidate offers from cache
    candidates = get_cached_offers(
        experience_levels=experience_levels,
        skills=skills,
        workplace_type=workplace_type,
        limit=limit * 3,  # fetch more to account for already-scored
    )

    if not candidates:
        return []

    # Check which offers already have current scores
    db = get_db()
    slugs = [c["slug"] for c in candidates]
    placeholders = ",".join("?" * len(slugs))
    existing = db.execute(
        f"SELECT offer_slug FROM offer_scores WHERE user_id = ? AND profile_hash = ? AND offer_slug IN ({placeholders})",
        [user_id, profile_hash] + slugs,
    ).fetchall()
    db.close()

    scored_slugs = {r["offer_slug"] for r in existing}
    unscored = [c for c in candidates if c["slug"] not in scored_slugs]

    # Score unscored offers in batches
    if unscored:
        to_score = unscored[:limit]
        for i in range(0, len(to_score), BATCH_SIZE):
            batch = to_score[i : i + BATCH_SIZE]
            try:
                score_batch(user_id, profile, profile_hash, batch)
            except Exception as e:
                logger.error(f"[scorer] Batch scoring failed: {e}")

    # Fetch all scores sorted by score
    db = get_db()
    rows = db.execute(
        """SELECT os.*, jo.title, jo.company_name, jo.required_skills,
                  jo.nice_to_have_skills, jo.experience_level, jo.workplace_type,
                  jo.working_time, jo.employment_types, jo.city, jo.published_at, jo.slug
           FROM offer_scores os
           JOIN jjit_offers jo ON os.offer_slug = jo.slug
           WHERE os.user_id = ? AND os.profile_hash = ?
           ORDER BY os.overall_score DESC
           LIMIT ?""",
        (user_id, profile_hash, limit),
    ).fetchall()
    db.close()

    results = []
    for r in rows:
        emp_types = json.loads(r["employment_types"]) if r["employment_types"] else []
        from services.jjit import _format_salary
        results.append({
            "offer": {
                "slug": r["slug"],
                "title": r["title"],
                "company_name": r["company_name"],
                "required_skills": json.loads(r["required_skills"]) if r["required_skills"] else [],
                "nice_to_have_skills": json.loads(r["nice_to_have_skills"]) if r["nice_to_have_skills"] else [],
                "experience_level": r["experience_level"],
                "workplace_type": r["workplace_type"],
                "working_time": r["working_time"],
                "salary_display": _format_salary(emp_types),
                "city": r["city"],
                "published_at": r["published_at"],
                "url": f"https://justjoin.it/job-offer/{r['slug']}",
            },
            "overall_score": r["overall_score"],
            "skill_match": json.loads(r["skill_match"]) if r["skill_match"] else {},
            "experience_fit": json.loads(r["experience_fit"]) if r["experience_fit"] else {},
            "suggestions": json.loads(r["suggestions"]) if r["suggestions"] else [],
            "reasoning": r["reasoning"] or "",
        })

    return results


def aggregate_suggestions(user_id: int, top_n: int = 10) -> list[dict]:
    """Aggregate and deduplicate suggestions across top scored offers."""
    db = get_db()
    rows = db.execute(
        """SELECT suggestions FROM offer_scores
           WHERE user_id = ?
           ORDER BY overall_score DESC
           LIMIT 20""",
        (user_id,),
    ).fetchall()
    db.close()

    all_suggestions = []
    seen_titles = set()
    for r in rows:
        try:
            suggestions = json.loads(r["suggestions"]) if r["suggestions"] else []
            for s in suggestions:
                title = s.get("title", "").lower()
                if title and title not in seen_titles:
                    seen_titles.add(title)
                    all_suggestions.append(s)
        except (json.JSONDecodeError, TypeError):
            continue

    # Sort by priority (high first)
    priority_order = {"high": 0, "medium": 1, "low": 2}
    all_suggestions.sort(key=lambda s: priority_order.get(s.get("priority", "medium"), 1))

    return all_suggestions[:top_n]
