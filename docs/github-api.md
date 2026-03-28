# GitHub REST API Developer Guide -- Profile Scraper

> Comprehensive reference for building an app that extracts skills, projects, and
> experience from a GitHub user's public profile. Written for hackathon speed.

**Base URL for all endpoints:** `https://api.github.com`

**Recommended headers on every request:**

```
Accept: application/vnd.github+json
X-GitHub-Api-Version: 2022-11-28
```

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Rate Limits](#2-rate-limits)
3. [Pagination](#3-pagination)
4. [Get a User's Public Profile](#4-get-a-users-public-profile)
5. [List a User's Repositories](#5-list-a-users-repositories)
6. [Get Repository Details](#6-get-repository-details)
7. [Get Repository Languages](#7-get-repository-languages)
8. [Get Repository Topics](#8-get-repository-topics)
9. [Get README Content](#9-get-readme-content)
10. [Get User's Organizations](#10-get-users-organizations)
11. [Get User's Starred Repos](#11-get-users-starred-repos)
12. [Get User's Public Events (Activity)](#12-get-users-public-events-activity)
13. [Search API](#13-search-api)
14. [Contribution Stats (Workaround)](#14-contribution-stats-workaround)
15. [Complete Python Scraper](#15-complete-python-scraper)
16. [Endpoint Quick-Reference Table](#16-endpoint-quick-reference-table)
17. [Gotchas and Tips](#17-gotchas-and-tips)

---

## 1. Authentication

### No Authentication (Hackathon Quick-Start)

Every endpoint in this guide works without authentication on **public** data.
You simply hit the URL. The trade-off is a 60-requests-per-hour rate limit.

### Personal Access Token (PAT) -- Recommended

Creates a 5,000 req/hr limit and is the easiest upgrade.

1. Go to https://github.com/settings/tokens
2. Click **"Generate new token (classic)"**
3. Select scopes: `public_repo` is enough for reading public data. Select
   `read:user` and `read:org` if you also want full org membership info.
4. Copy the token (starts with `ghp_...`).

**Usage in curl:**

```bash
curl -H "Authorization: Bearer ghp_YOUR_TOKEN_HERE" \
     -H "Accept: application/vnd.github+json" \
     https://api.github.com/users/octocat
```

**Usage in Python:**

```python
import requests

HEADERS = {
    "Authorization": "Bearer ghp_YOUR_TOKEN_HERE",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}

resp = requests.get("https://api.github.com/users/octocat", headers=HEADERS)
```

### OAuth App (for multi-user apps)

If your app lets *other* users log in with GitHub:

1. Register an OAuth App at https://github.com/settings/applications/new
2. Use the OAuth web flow: redirect users to
   `https://github.com/login/oauth/authorize?client_id=YOUR_CLIENT_ID&scope=read:user`
3. Exchange the callback `code` for an access token at
   `https://github.com/login/oauth/access_token`

For a hackathon, PATs are usually sufficient.

---

## 2. Rate Limits

### Limits by Authentication Level

| Auth Level          | Core API Limit   | Search API Limit     | Reset Window |
|---------------------|------------------|----------------------|--------------|
| **Unauthenticated** | 60 req/hour      | 10 req/minute        | Rolling hour |
| **Authenticated**   | 5,000 req/hour   | 30 req/minute        | Rolling hour |

Search API has its own separate bucket -- it does NOT count against the core limit.

### Checking Your Remaining Quota

Every API response includes these headers:

```
X-RateLimit-Limit: 60              # Max requests in window
X-RateLimit-Remaining: 38          # Requests left
X-RateLimit-Used: 22               # Requests consumed
X-RateLimit-Reset: 1774689006      # Unix timestamp when limit resets
X-RateLimit-Resource: core         # Which bucket (core, search, etc.)
```

**Dedicated endpoint** (does NOT count against your limit):

```bash
curl https://api.github.com/rate_limit
```

**Hackathon math:** At 60 req/hr unauthenticated, you can scrape about 1 full
profile per minute (profile + repos + languages for each repo). With a token
at 5,000/hr, you can do ~80 profiles per minute.

---

## 3. Pagination

GitHub paginates all list endpoints. Two mechanisms:

### Query Parameters

| Parameter  | Default | Max | Description           |
|------------|---------|-----|-----------------------|
| `per_page` | 30      | 100 | Items per page        |
| `page`     | 1       | --  | 1-indexed page number |

### Link Header

Every paginated response includes a `Link` header:

```
Link: <https://api.github.com/user/1024025/repos?per_page=2&page=2>; rel="next",
      <https://api.github.com/user/1024025/repos?per_page=2&page=6>; rel="last"
```

### Python Helper -- Auto-Paginate

```python
def get_all_pages(url, headers=None, params=None):
    """Follow pagination to collect all items from a list endpoint."""
    if params is None:
        params = {}
    params.setdefault("per_page", 100)

    results = []
    while url:
        resp = requests.get(url, headers=headers, params=params)
        resp.raise_for_status()
        results.extend(resp.json())

        # After the first request, params are baked into the Link URL
        params = {}

        # Parse Link header for the next page
        link = resp.headers.get("Link", "")
        url = None
        for part in link.split(","):
            if 'rel="next"' in part:
                url = part.split(";")[0].strip(" <>")
    return results
```

---

## 4. Get a User's Public Profile

### Endpoint

```
GET /users/{username}
```

### Python

```python
def get_user_profile(username):
    resp = requests.get(
        f"https://api.github.com/users/{username}",
        headers=HEADERS,
    )
    resp.raise_for_status()
    return resp.json()
```

### Response -- Key Fields

```json
{
  "login": "octocat",
  "id": 583231,
  "avatar_url": "https://avatars.githubusercontent.com/u/583231?v=4",
  "html_url": "https://github.com/octocat",
  "name": "The Octocat",
  "company": "@github",
  "blog": "https://github.blog",
  "location": "San Francisco",
  "email": null,
  "hireable": null,
  "bio": null,
  "twitter_username": null,
  "public_repos": 8,
  "public_gists": 8,
  "followers": 22192,
  "following": 9,
  "created_at": "2011-01-25T18:44:36Z",
  "updated_at": "2026-03-22T11:23:02Z"
}
```

### Fields Most Useful for Profile Scraping

| Field           | Type        | Use For                                      |
|-----------------|-------------|----------------------------------------------|
| `login`         | string      | Canonical username                           |
| `name`          | string/null | Display name                                 |
| `bio`           | string/null | Self-described summary -- parse for skills    |
| `company`       | string/null | Current employer                             |
| `location`      | string/null | Geographic location                          |
| `blog`          | string/null | Personal website / portfolio                 |
| `email`         | string/null | Public email (often null)                    |
| `hireable`      | bool/null   | Whether user marked themselves hireable      |
| `public_repos`  | integer     | Total public repo count                      |
| `followers`     | integer     | Follower count -- proxy for influence         |
| `created_at`    | datetime    | Account age -- proxy for experience           |

---

## 5. List a User's Repositories

### Endpoint

```
GET /users/{username}/repos
```

### Query Parameters

| Parameter   | Type    | Default     | Values                                                  |
|-------------|---------|-------------|---------------------------------------------------------|
| `type`      | string  | `owner`     | `all`, `owner`, `member`                                |
| `sort`      | string  | `full_name` | `created`, `updated`, `pushed`, `full_name`             |
| `direction` | string  | varies      | `asc`, `desc` (default `asc` for full_name, else `desc`)|
| `per_page`  | integer | 30          | 1--100                                                  |
| `page`      | integer | 1           | Page number                                             |

### Python

```python
def get_user_repos(username, sort="updated"):
    """Get all public repos for a user, auto-paginated."""
    repos = get_all_pages(
        f"https://api.github.com/users/{username}/repos",
        headers=HEADERS,
        params={"sort": sort, "type": "owner"},  # "owner" excludes forks
    )
    return repos
```

### Response -- Key Fields per Repo

```json
{
  "id": 1300192,
  "name": "Spoon-Knife",
  "full_name": "octocat/Spoon-Knife",
  "private": false,
  "html_url": "https://github.com/octocat/Spoon-Knife",
  "description": "This repo is for demonstration purposes only.",
  "fork": false,
  "languages_url": "https://api.github.com/repos/octocat/Spoon-Knife/languages",
  "created_at": "2011-01-27T19:30:43Z",
  "updated_at": "2026-03-28T04:03:54Z",
  "pushed_at": "2024-08-21T15:25:42Z",
  "homepage": "",
  "size": 2,
  "stargazers_count": 13702,
  "watchers_count": 13702,
  "language": "HTML",
  "forks_count": 156756,
  "archived": false,
  "open_issues_count": 20434,
  "license": null,
  "topics": [],
  "visibility": "public",
  "default_branch": "main"
}
```

### Fields Most Useful for Profile Scraping

| Field              | Type        | Use For                                           |
|--------------------|-------------|---------------------------------------------------|
| `name`             | string      | Project name                                      |
| `description`      | string/null | What the project does                             |
| `language`         | string/null | Primary language (single value)                   |
| `languages_url`    | string      | URL to get ALL languages (see Section 7)          |
| `stargazers_count` | integer     | Popularity signal                                 |
| `forks_count`      | integer     | Community adoption signal                         |
| `fork`             | boolean     | Filter out forks to get original work             |
| `topics`           | string[]    | Tags/keywords the owner assigned                  |
| `pushed_at`        | datetime    | Last code activity (more reliable than updated_at)|
| `size`             | integer     | Repo size in KB -- proxy for project scale         |

---

## 6. Get Repository Details

### Endpoint

```
GET /repos/{owner}/{repo}
```

Returns the same fields as the list endpoint, PLUS:
- `parent` -- if it is a fork, the upstream repo object
- `source` -- the root repo in a fork chain
- `network_count`, `subscribers_count`
- `organization` -- org object if owned by an org

```python
def get_repo_detail(owner, repo):
    resp = requests.get(
        f"https://api.github.com/repos/{owner}/{repo}",
        headers=HEADERS,
    )
    resp.raise_for_status()
    return resp.json()
```

---

## 7. Get Repository Languages

### Endpoint

```
GET /repos/{owner}/{repo}/languages
```

Returns a JSON object mapping language names to byte counts. **This is the most
valuable endpoint for extracting skills.**

### Response

```json
{
  "C": 1390517937,
  "Assembly": 9752379,
  "Shell": 5759928,
  "Rust": 4628143,
  "Python": 3940580,
  "Makefile": 2868452,
  "Perl": 1131784
}
```

Values are **bytes of code**, not lines. Use them to compute percentages.

### Python -- Aggregate Languages Across All Repos

```python
from collections import defaultdict

def get_repo_languages(owner, repo):
    """Get language breakdown for a repo. Returns {lang: bytes}."""
    resp = requests.get(
        f"https://api.github.com/repos/{owner}/{repo}/languages",
        headers=HEADERS,
    )
    resp.raise_for_status()
    return resp.json()


def aggregate_user_languages(username):
    """Build a total language profile across all of a user's repos."""
    repos = get_user_repos(username)
    totals = defaultdict(int)

    for repo in repos:
        if repo["fork"]:
            continue  # Skip forks -- not their original work
        langs = get_repo_languages(repo["owner"]["login"], repo["name"])
        for lang, byte_count in langs.items():
            totals[lang] += byte_count

    return dict(sorted(totals.items(), key=lambda x: x[1], reverse=True))
```

---

## 8. Get Repository Topics

### Endpoint

```
GET /repos/{owner}/{repo}/topics
```

Topics are user-assigned tags like `machine-learning`, `react`, `cli-tool`.
Excellent for extracting skills and project categories.

### Response

```json
{
  "names": ["javascript", "library", "react", "ui", "declarative", "frontend"]
}
```

> Note: Topics are also returned in the `topics` array of each repo object from
> the list repos endpoint (Section 5). This dedicated endpoint is only needed if
> you want to ensure completeness.

---

## 9. Get README Content

### Endpoint

```
GET /repos/{owner}/{repo}/readme
```

### curl

```bash
# Get README metadata + base64 content
curl https://api.github.com/repos/octocat/Spoon-Knife/readme

# Get raw markdown directly (no base64 decoding needed)
curl -H "Accept: application/vnd.github.raw+json" \
     https://api.github.com/repos/octocat/Spoon-Knife/readme

# Get rendered HTML
curl -H "Accept: application/vnd.github.html+json" \
     https://api.github.com/repos/octocat/Spoon-Knife/readme
```

### Python

```python
import base64

def get_readme(owner, repo):
    """Get decoded README text for a repository."""
    resp = requests.get(
        f"https://api.github.com/repos/{owner}/{repo}/readme",
        headers=HEADERS,
    )
    if resp.status_code == 404:
        return None  # No README in this repo
    resp.raise_for_status()
    data = resp.json()
    content_b64 = data["content"]
    return base64.b64decode(content_b64).decode("utf-8")


def get_readme_raw(owner, repo):
    """Get raw README markdown directly (no base64 decoding needed)."""
    raw_headers = {**HEADERS, "Accept": "application/vnd.github.raw+json"}
    resp = requests.get(
        f"https://api.github.com/repos/{owner}/{repo}/readme",
        headers=raw_headers,
    )
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    return resp.text
```

> **Shortcut:** Fetch raw README from
> `https://raw.githubusercontent.com/{owner}/{repo}/{branch}/README.md`
> -- this does NOT count against GitHub API rate limits.

---

## 10. Get User's Organizations

### Endpoint

```
GET /users/{username}/orgs
```

### Response shape (per org)

```json
{
  "login": "github",
  "id": 9919,
  "url": "https://api.github.com/orgs/github",
  "avatar_url": "https://avatars.githubusercontent.com/u/9919?v=4",
  "description": "How people build software."
}
```

Only returns **public** organization memberships.

---

## 11. Get User's Starred Repos

### Endpoint

```
GET /users/{username}/starred
```

Starred repos reveal the user's interests, even technologies they use but
don't have their own repos for.

```python
def get_user_stars(username, max_pages=3):
    """Get starred repos (limited pages to save rate limit)."""
    stars = []
    for page in range(1, max_pages + 1):
        resp = requests.get(
            f"https://api.github.com/users/{username}/starred",
            headers=HEADERS,
            params={"per_page": 100, "page": page, "sort": "created"},
        )
        resp.raise_for_status()
        batch = resp.json()
        if not batch:
            break
        stars.extend(batch)
    return stars
```

---

## 12. Get User's Public Events (Activity)

### Endpoint

```
GET /users/{username}/events/public
```

### Constraints

- Returns at most **300 events** from the **past 90 days**
- Paginated: `per_page` (max 100), `page`

### Event Types Most Useful for Profile Analysis

| Event Type              | What it Tells You                                    |
|-------------------------|------------------------------------------------------|
| `PushEvent`             | Commits pushed -- frequency = coding activity         |
| `PullRequestEvent`      | PRs opened/merged -- collaboration signal             |
| `IssuesEvent`           | Issues opened/closed -- project management            |
| `CreateEvent`           | New repos/branches created                           |
| `ForkEvent`             | Repos forked -- interests                             |
| `WatchEvent`            | Repos starred                                        |
| `PullRequestReviewEvent`| Code reviews done -- seniority signal                 |

### Python -- Activity Frequency Analysis

```python
from collections import Counter
from datetime import datetime

def get_user_activity(username):
    """Analyze a user's recent public activity."""
    events = get_all_pages(
        f"https://api.github.com/users/{username}/events/public",
        headers=HEADERS,
    )

    event_types = Counter(e["type"] for e in events)
    active_repos = Counter(e["repo"]["name"] for e in events)

    push_events = [e for e in events if e["type"] == "PushEvent"]
    total_commits = sum(e["payload"].get("size", 0) for e in push_events)

    return {
        "total_events": len(events),
        "total_commits_approx": total_commits,
        "event_types": dict(event_types.most_common()),
        "most_active_repos": dict(active_repos.most_common(10)),
    }
```

---

## 13. Search API

### 13a. Search Repositories

```
GET /search/repositories?q={query}
```

**Rate limit:** 10/min unauthenticated, 30/min authenticated.

#### Query Qualifiers

| Qualifier        | Example                        | Description                      |
|------------------|--------------------------------|----------------------------------|
| `user:{name}`    | `user:octocat`                 | Repos owned by user              |
| `language:{lang}`| `language:python`              | Filter by language               |
| `stars:>N`       | `stars:>100`                   | Min star count                   |
| `in:name`        | `todo in:name`                 | Search repo names                |
| `in:description` | `api in:description`           | Search descriptions              |
| `in:readme`      | `machine learning in:readme`   | Search README content            |
| `topic:{name}`   | `topic:react`                  | Filter by topic                  |

```python
def search_user_repos(username, language=None, sort="stars"):
    """Search a user's repos, optionally filtered by language."""
    query = f"user:{username}"
    if language:
        query += f" language:{language}"
    resp = requests.get(
        "https://api.github.com/search/repositories",
        headers=HEADERS,
        params={"q": query, "sort": sort, "per_page": 100},
    )
    resp.raise_for_status()
    return resp.json()["items"]
```

### 13b. Search Users

```
GET /search/users?q={query}
```

| Qualifier          | Example                | Description                 |
|--------------------|------------------------|-----------------------------|
| `location:{place}` | `location:seattle`     | Filter by location          |
| `language:{lang}`  | `language:rust`        | User's primary language     |
| `followers:>N`     | `followers:>1000`      | Min followers               |
| `repos:>N`         | `repos:>50`            | Min public repos            |

---

## 14. Contribution Stats (Workaround)

The REST API does NOT have a dedicated contribution calendar endpoint. Options:

### Option A: Scrape the Contribution SVG (No API needed)

```
https://github.com/users/{username}/contributions
```

### Option B: Events API (Section 12)

Count PushEvents for a rough "commits in last 90 days" metric.

### Option C: GraphQL API (Best, but needs auth)

```graphql
query {
  user(login: "octocat") {
    contributionsCollection {
      totalCommitContributions
      totalPullRequestContributions
      totalIssueContributions
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            contributionCount
            date
          }
        }
      }
    }
  }
}
```

```python
def get_contribution_stats_graphql(username, token):
    """Use GraphQL API to get full contribution stats (requires token)."""
    query = """
    query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          totalCommitContributions
          totalPullRequestContributions
          totalIssueContributions
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
      }
    }
    """
    resp = requests.post(
        "https://api.github.com/graphql",
        json={"query": query, "variables": {"login": username}},
        headers={"Authorization": f"Bearer {token}"},
    )
    resp.raise_for_status()
    return resp.json()["data"]["user"]["contributionsCollection"]
```

---

## 15. Complete Python Scraper

A full working example that brings everything together.

```python
"""
github_profile_scraper.py

Extracts skills, projects, and experience from a GitHub user's public profile.
Works without authentication (60 req/hr) or with a PAT (5,000 req/hr).

Usage:
    python github_profile_scraper.py <username> [--token ghp_...]
"""

import argparse
import base64
import requests
import time
from collections import Counter, defaultdict
from datetime import datetime


API_BASE = "https://api.github.com"


class GitHubProfileScraper:
    def __init__(self, token=None):
        self.headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        if token:
            self.headers["Authorization"] = f"Bearer {token}"

    def _get(self, url, params=None):
        """Make a GET request with rate-limit awareness."""
        resp = requests.get(url, headers=self.headers, params=params)
        if resp.status_code == 403 and "rate limit" in resp.text.lower():
            reset = int(resp.headers.get("X-RateLimit-Reset", 0))
            wait = max(reset - int(time.time()), 1)
            print(f"Rate limited. Waiting {wait}s...")
            time.sleep(wait)
            resp = requests.get(url, headers=self.headers, params=params)
        resp.raise_for_status()
        return resp

    def _get_all_pages(self, url, params=None):
        """Auto-paginate a list endpoint."""
        if params is None:
            params = {}
        params.setdefault("per_page", 100)
        results = []
        while url:
            resp = self._get(url, params=params)
            results.extend(resp.json())
            params = {}
            link = resp.headers.get("Link", "")
            url = None
            for part in link.split(","):
                if 'rel="next"' in part:
                    url = part.split(";")[0].strip(" <>")
        return results

    def get_profile(self, username):
        resp = self._get(f"{API_BASE}/users/{username}")
        return resp.json()

    def get_repos(self, username):
        return self._get_all_pages(
            f"{API_BASE}/users/{username}/repos",
            params={"sort": "updated", "type": "owner"},
        )

    def get_languages(self, owner, repo):
        resp = self._get(f"{API_BASE}/repos/{owner}/{repo}/languages")
        return resp.json()

    def get_readme(self, owner, repo):
        resp = requests.get(
            f"{API_BASE}/repos/{owner}/{repo}/readme",
            headers=self.headers,
        )
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return base64.b64decode(resp.json()["content"]).decode("utf-8")

    def get_orgs(self, username):
        return self._get_all_pages(f"{API_BASE}/users/{username}/orgs")

    def get_events(self, username):
        return self._get_all_pages(
            f"{API_BASE}/users/{username}/events/public"
        )

    def scrape(self, username):
        """Run the full profile extraction pipeline."""
        print(f"Scraping profile: {username}")

        profile = self.get_profile(username)
        repos = self.get_repos(username)
        original_repos = [r for r in repos if not r["fork"]]

        # Aggregate languages across all original repos
        language_bytes = defaultdict(int)
        for repo in original_repos:
            langs = self.get_languages(username, repo["name"])
            for lang, nbytes in langs.items():
                language_bytes[lang] += nbytes

        total_bytes = sum(language_bytes.values()) or 1
        languages = {
            lang: {
                "bytes": nbytes,
                "percentage": round(nbytes / total_bytes * 100, 2),
            }
            for lang, nbytes in sorted(
                language_bytes.items(), key=lambda x: x[1], reverse=True
            )
        }

        # Aggregate topics
        all_topics = Counter()
        for repo in original_repos:
            for topic in repo.get("topics", []):
                all_topics[topic] += 1

        # Top projects by stars
        top_projects = sorted(
            original_repos,
            key=lambda r: r["stargazers_count"],
            reverse=True,
        )[:20]
        projects = [
            {
                "name": r["name"],
                "description": r["description"],
                "url": r["html_url"],
                "language": r["language"],
                "stars": r["stargazers_count"],
                "forks": r["forks_count"],
                "topics": r.get("topics", []),
                "created": r["created_at"],
                "last_push": r["pushed_at"],
            }
            for r in top_projects
        ]

        orgs = self.get_orgs(username)
        events = self.get_events(username)
        event_types = Counter(e["type"] for e in events)
        push_events = [e for e in events if e["type"] == "PushEvent"]
        recent_commits = sum(e["payload"].get("size", 0) for e in push_events)

        return {
            "username": profile["login"],
            "name": profile.get("name"),
            "bio": profile.get("bio"),
            "company": profile.get("company"),
            "location": profile.get("location"),
            "blog": profile.get("blog"),
            "email": profile.get("email"),
            "hireable": profile.get("hireable"),
            "profile_url": profile.get("html_url"),
            "account_created": profile.get("created_at"),
            "followers": profile.get("followers"),
            "public_repos_count": profile.get("public_repos"),
            "organizations": [o["login"] for o in orgs],
            "languages": languages,
            "topics": dict(all_topics.most_common(30)),
            "top_projects": projects,
            "recent_activity": {
                "events_last_90_days": len(events),
                "commits_last_90_days": recent_commits,
                "event_breakdown": dict(event_types.most_common()),
            },
        }


if __name__ == "__main__":
    import json

    parser = argparse.ArgumentParser(description="Scrape a GitHub profile")
    parser.add_argument("username", help="GitHub username to scrape")
    parser.add_argument("--token", help="GitHub PAT for higher rate limits")
    args = parser.parse_args()

    scraper = GitHubProfileScraper(token=args.token)
    result = scraper.scrape(args.username)
    print(json.dumps(result, indent=2, default=str))
```

---

## 16. Endpoint Quick-Reference Table

| Purpose                   | Method | Endpoint                                        | Auth Required | Rate Bucket |
|---------------------------|--------|-------------------------------------------------|---------------|-------------|
| User profile              | GET    | `/users/{username}`                             | No            | core        |
| User's repos              | GET    | `/users/{username}/repos`                       | No            | core        |
| Repo detail               | GET    | `/repos/{owner}/{repo}`                         | No            | core        |
| Repo languages            | GET    | `/repos/{owner}/{repo}/languages`               | No            | core        |
| Repo topics               | GET    | `/repos/{owner}/{repo}/topics`                  | No            | core        |
| Repo README               | GET    | `/repos/{owner}/{repo}/readme`                  | No            | core        |
| User's orgs               | GET    | `/users/{username}/orgs`                         | No            | core        |
| User's starred repos      | GET    | `/users/{username}/starred`                     | No            | core        |
| User's public events      | GET    | `/users/{username}/events/public`               | No            | core        |
| Search repos              | GET    | `/search/repositories?q=...`                    | No            | search      |
| Search users              | GET    | `/search/users?q=...`                           | No            | search      |
| Search code               | GET    | `/search/code?q=...`                            | **Yes**       | search      |
| Check rate limit          | GET    | `/rate_limit`                                   | No            | (free)      |
| Contributions (GraphQL)   | POST   | `/graphql`                                       | **Yes**       | graphql     |

---

## 17. Gotchas and Tips

### Rate Limit Strategy for Hackathons

The biggest bottleneck is the languages endpoint -- you need one call per repo.
For a user with 50 repos, that is 52 API calls (profile + repos list + 50 x
languages). At 60/hr unauthenticated, you can do about 1 user per minute.

**Mitigations:**
- Use a PAT (5,000/hr) -- takes 10 seconds to set up
- Skip forked repos (`repo["fork"] == True`) -- they are not original work
- Use the `language` field from the repo list as a quick approximation
- Cache results aggressively

### Filtering Forks

Always filter out forks when analyzing original work. Forks inflate language
stats and project counts with code the user did not write.

### README as a Skills Signal

Many developers list technologies in their repo READMEs. Consider keyword
extraction for framework names (React, Django, Flask, Spring Boot, etc.),
tool names (Docker, Kubernetes, Terraform, etc.), and shields.io badges.

### The `topics` Field is Gold

Repository topics are manually curated by the repo owner and are the single
best structured signal for skills and technologies. Always collect them.

### Alternative README URL (No Rate Limit)

```
https://raw.githubusercontent.com/{owner}/{repo}/{branch}/README.md
```

This does NOT count against GitHub API rate limits.

### The Events API is Limited

Events only go back 90 days and return at most 300 events. For long-term
activity analysis, the GraphQL `contributionsCollection` is far superior
(but requires authentication).

### Conditional Requests (ETag)

Use `ETag` / `If-None-Match` headers for polling. A 304 response does NOT
count against your rate limit:

```python
# First request
resp = requests.get(url, headers=headers)
etag = resp.headers.get("ETag")

# Subsequent request
resp = requests.get(url, headers={**headers, "If-None-Match": etag})
if resp.status_code == 304:
    print("Not modified -- use cached data")
```

### API Versioning

Always send `X-GitHub-Api-Version: 2022-11-28` to pin to a stable API version.
