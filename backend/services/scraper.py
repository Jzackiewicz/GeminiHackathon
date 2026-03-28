import os
import httpx


GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

MAX_REPOS_LANGUAGES = 15  # repos to fetch per-repo language breakdown for
MAX_REPOS_README = 5      # repos to fetch READMEs for
README_MAX_CHARS = 3000   # truncate long READMEs


def _github_headers(token: str | None = None) -> dict:
    """Build GitHub API headers, preferring the user's OAuth token."""
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    tok = token or GITHUB_TOKEN
    if tok:
        headers["Authorization"] = f"Bearer {tok}"
    return headers


async def fetch_github_profile(username: str, token: str | None = None) -> dict:
    """Quick fetch — profile + repo list + top languages. Used for initial connect."""
    headers = _github_headers(token)
    async with httpx.AsyncClient(headers=headers, timeout=15) as client:
        # Use /user for authenticated user (includes private repos), /users/{} for public
        if token:
            user_resp = await client.get("https://api.github.com/user")
        else:
            user_resp = await client.get(f"https://api.github.com/users/{username}")
        user_resp.raise_for_status()
        user = user_resp.json()

        repos_resp = await client.get(
            "https://api.github.com/user/repos" if token else f"https://api.github.com/users/{username}/repos",
            params={"sort": "updated", "per_page": 30, "affiliation": "owner"} if token else {"sort": "updated", "per_page": 30, "type": "owner"},
        )
        repos_resp.raise_for_status()
        repos = repos_resp.json()

    lang_counts: dict[str, int] = {}
    for repo in repos:
        if repo.get("fork"):
            continue
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
            for r in repos if not r.get("fork")
        ][:10],
    }


async def deep_scrape_github(username: str, token: str | None = None) -> dict:
    """Full scrape — profile, repos, per-repo languages, READMEs, topics, activity.

    This is the heavy version used for Gemini analysis.
    If token is provided, includes private repos.
    """
    headers = _github_headers(token)
    async with httpx.AsyncClient(headers=headers, timeout=20) as client:
        # 1. Profile
        if token:
            user = (await client.get("https://api.github.com/user")).json()
        else:
            user = (await client.get(f"https://api.github.com/users/{username}")).json()

        # 2. Repos (all pages, owner only, skip forks)
        repos_url = "https://api.github.com/user/repos" if token else f"https://api.github.com/users/{username}/repos"
        all_repos = []
        page = 1
        while True:
            params = {"sort": "pushed", "per_page": 100, "page": page}
            if token:
                params["affiliation"] = "owner"
            else:
                params["type"] = "owner"
            resp = await client.get(repos_url, params=params)
            resp.raise_for_status()
            batch = resp.json()
            if not batch:
                break
            all_repos.extend(batch)
            page += 1
            if page > 5:  # safety cap at 500 repos
                break

        original_repos = [r for r in all_repos if not r.get("fork")]

        # Sort by stars for "top" selection, by push date for "recent"
        by_stars = sorted(original_repos, key=lambda r: r.get("stargazers_count", 0), reverse=True)
        by_recent = sorted(original_repos, key=lambda r: r.get("pushed_at", ""), reverse=True)

        # Pick repos to deep-dive: union of top starred + most recent
        deep_dive_names = set()
        deep_dive_repos = []
        for r in (by_stars[:MAX_REPOS_LANGUAGES] + by_recent[:MAX_REPOS_LANGUAGES]):
            if r["name"] not in deep_dive_names:
                deep_dive_names.add(r["name"])
                deep_dive_repos.append(r)

        # 3. Per-repo language breakdown
        language_bytes: dict[str, int] = {}
        repo_details = []
        for repo in deep_dive_repos[:MAX_REPOS_LANGUAGES]:
            lang_resp = await client.get(
                f"https://api.github.com/repos/{username}/{repo['name']}/languages"
            )
            if lang_resp.status_code == 200:
                langs = lang_resp.json()
                for lang, nbytes in langs.items():
                    language_bytes[lang] = language_bytes.get(lang, 0) + nbytes
                repo_details.append({
                    "name": repo["name"],
                    "description": repo.get("description"),
                    "private": repo.get("private", False),
                    "stars": repo.get("stargazers_count", 0),
                    "forks": repo.get("forks_count", 0),
                    "topics": repo.get("topics", []),
                    "languages": langs,
                    "created_at": repo.get("created_at"),
                    "pushed_at": repo.get("pushed_at"),
                })

    # 4. READMEs for top repos (via raw.githubusercontent.com — no rate limit)
    async with httpx.AsyncClient(timeout=10) as raw_client:
        for repo_info in repo_details[:MAX_REPOS_README]:
            # Try common branch names
            readme_text = None
            for branch in ("main", "master"):
                readme_resp = await raw_client.get(
                    f"https://raw.githubusercontent.com/{username}/{repo_info['name']}/{branch}/README.md"
                )
                if readme_resp.status_code == 200:
                    readme_text = readme_resp.text[:README_MAX_CHARS]
                    break
            repo_info["readme"] = readme_text

    # 5. Aggregate topics
    all_topics: dict[str, int] = {}
    for repo in original_repos:
        for topic in repo.get("topics", []):
            all_topics[topic] = all_topics.get(topic, 0) + 1

    # 6. Language percentages
    total_bytes = sum(language_bytes.values()) or 1
    languages_ranked = sorted(language_bytes.items(), key=lambda x: x[1], reverse=True)
    languages = {
        lang: {"bytes": nbytes, "percent": round(nbytes / total_bytes * 100, 1)}
        for lang, nbytes in languages_ranked
    }

    return {
        "username": user.get("login"),
        "name": user.get("name"),
        "bio": user.get("bio"),
        "company": user.get("company"),
        "location": user.get("location"),
        "blog": user.get("blog"),
        "hireable": user.get("hireable"),
        "followers": user.get("followers"),
        "account_created": user.get("created_at"),
        "public_repos_count": user.get("public_repos"),
        "original_repos_count": len(original_repos),
        "languages": languages,
        "topics": dict(sorted(all_topics.items(), key=lambda x: x[1], reverse=True)[:30]),
        "repos": repo_details,
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
