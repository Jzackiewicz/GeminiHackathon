import os
import httpx


GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_HEADERS = {"Authorization": f"Bearer {GITHUB_TOKEN}"} if GITHUB_TOKEN else {}


async def fetch_github_profile(username: str) -> dict:
    """Fetch GitHub user profile, repos, and top languages."""
    async with httpx.AsyncClient() as client:
        user_resp = await client.get(
            f"https://api.github.com/users/{username}",
            headers=GITHUB_HEADERS,
        )
        user_resp.raise_for_status()
        user = user_resp.json()

        repos_resp = await client.get(
            f"https://api.github.com/users/{username}/repos",
            params={"sort": "updated", "per_page": 30},
            headers=GITHUB_HEADERS,
        )
        repos_resp.raise_for_status()
        repos = repos_resp.json()

    # Aggregate languages across repos
    lang_counts: dict[str, int] = {}
    for repo in repos:
        lang = repo.get("language")
        if lang:
            lang_counts[lang] = lang_counts.get(lang, 0) + 1

    top_languages = sorted(lang_counts, key=lang_counts.get, reverse=True)

    return {
        "name": user.get("name"),
        "bio": user.get("bio"),
        "public_repos": user.get("public_repos"),
        "languages": top_languages,
        "top_repos": [
            {"name": r["name"], "description": r.get("description"), "language": r.get("language"), "stars": r.get("stargazers_count", 0)}
            for r in repos[:10]
        ],
    }


async def search_justjoinit(keywords: list[str] | None = None, remote: bool = True) -> list[dict]:
    """Search JustJoinIT for job offers."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://api.justjoin.it/v2/user-panel/offers",
            params={
                "page": 1,
                "sortBy": "published",
                "orderBy": "DESC",
                "perPage": 20,
                "remote": remote,
            },
        )
        resp.raise_for_status()
        data = resp.json()

    offers = data.get("data", [])
    results = []
    for offer in offers:
        title = offer.get("title", "").lower()
        if keywords and not any(k.lower() in title for k in keywords):
            continue
        results.append({
            "title": offer.get("title"),
            "company": offer.get("companyName"),
            "url": f"https://justjoin.it/offers/{offer.get('slug', '')}",
            "requiredSkills": [s.get("name") for s in offer.get("requiredSkills", [])],
        })

    return results
