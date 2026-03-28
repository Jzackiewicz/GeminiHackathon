# Job Search & Match Scoring — Feature Documentation

> Branch: `job-search` | Base: `main`
> Status: **Backend POC complete**, frontend integration pending

## What This Does

Fetches real job offers from JustJoinIT, scores each one against the user's profile (GitHub analysis + LinkedIn data) using Gemini, and returns:

1. **Match score** (0-100) with natural language explanation
2. **Skill breakdown** — matched / missing / bonus skills
3. **Experience fit** — exact / above / below with reasoning
4. **Actionable suggestions** — what to learn, build, or certify to improve fit
5. **Aggregated ROI Actions** — deduplicated improvement suggestions across all scored offers

---

## Architecture

```
                                          ┌──────────────┐
                                          │  JustJoinIT  │
                                          │ Candidate API│
                                          └──────┬───────┘
                                                 │ fetch (cursor pagination)
                                                 ▼
┌──────────┐   POST /fetch    ┌──────────────────────────┐
│ Frontend │ ───────────────> │  jjit_offers (SQLite)     │  ← global cache, dedup by slug
│          │ <─────────────── │  ~10 offers/page          │
│          │   GET /status    └──────────┬───────────────┘
│          │                             │
│          │   GET /scored               │ on-demand
│          │ ─────────────────┐          │
│          │                  ▼          ▼
│          │            ┌─────────────────────┐
│          │            │  scorer.py           │
│          │            │  build_scoring_profile()  ← merges GitHub + LinkedIn from DB
│          │            │  ──────────────────  │
│          │            │  compact profile     │    ┌─────────┐
│          │            │  + batch of offers   │───>│ Gemini  │
│          │            │                      │<───│ Flash   │
│          │            │  parse JSON scores   │    └─────────┘
│          │            └──────────┬──────────┘
│          │                       │ store
│          │                       ▼
│          │            ┌──────────────────────┐
│          │ <───────── │  offer_scores (SQLite)│  ← per-user, cached by profile_hash
└──────────┘            └──────────────────────┘
```

---

## Data Sources Used for Scoring

The scorer assembles a **compact profile** from two DB sources:

### From GitHub (via `profiles` table — populated by existing `POST /api/profile/github`)

| Field | Example | Used for |
|-------|---------|----------|
| `technologies[]` | `[{name: "Python", proficiency: "expert", evidence: "80+ repos"}]` | Skill matching + proficiency weight |
| `experience_level` | `"senior"` | Experience fit comparison |
| `primary_role` | `"Senior Backend Developer"` | Role alignment |
| `strengths[]` | `["Backend API design", "AI/ML integration"]` | Bonus skill detection |
| `interests[]` | `["AI/ML", "Cloud-native"]` | Relevance weighting |
| `notable_projects[]` | `[{name: "data-pipeline", technologies: ["Python", "Docker"]}]` | Deep evidence of real work |
| `summary` | `"Senior Python dev, 7 years..."` | Context for Gemini |

### From LinkedIn (via `profiles.linkedin_data` JSON column)

| Field | Example | Used for |
|-------|---------|----------|
| `positions[]` | `[{company: "TechStartup", title: "Senior Backend Engineer", started_on: "2022-01"}]` | Duration = depth of experience |
| `education[]` | `[{school: "Warsaw UT", degree: "MSc CS", field: "AI"}]` | Academic background |
| `skills[]` | `["Python", "FastAPI", "Docker", "Machine Learning"]` | Cross-reference with GitHub skills |
| `certifications[]` | `[{name: "AWS SA Associate", authority: "Amazon"}]` | Formal qualifications |
| `posts[]` | `[{text: "Just shipped our AI interview simulator..."}]` | Interests + thought leadership (capped at 10) |
| `info.headline` | `"Senior Backend Engineer \| Python \| AI/ML"` | Self-described identity |

### From JustJoinIT (per offer)

| Field | Example | Used for |
|-------|---------|----------|
| `title` | `"AI Product Engineer (Tooling)"` | Role alignment |
| `required_skills[]` | `["Python", "React", "RAG", "LLM APIs"]` | Primary matching target |
| `nice_to_have_skills[]` | `["Kubernetes"]` | Bonus matching |
| `experience_level` | `"senior"` | Level fit |
| `workplace_type` | `"remote"` | Preference filter |
| `salary_display` | `"18000-25000 PLN/Month b2b"` | Display only (not scored) |
| `city` | `"Wroclaw"` | Display + location filter |

---

## New API Endpoints

All on the existing `APIRouter(prefix="/api/jobs")`.

### `POST /api/jobs/fetch` (auth required)

Triggers background JustJoinIT offer fetching. Returns immediately.

```
Request:  { "skills": ["Python"], "experience_levels": ["senior"], "workplace_type": "remote" }
          (all optional — derives from user profile if omitted)
Response: { "status": "fetching", "total_offers": 0, "last_fetched_at": null }
```

- Uses `asyncio.ensure_future()` to run in background
- `asyncio.Lock` prevents concurrent fetches
- Candidate API returns ~10 offers/page with cursor pagination
- 1.5s delay between pages (Cloudflare courtesy)
- Upserts by slug (no duplicates)

### `GET /api/jobs/fetch/status` (no auth)

```
Response: { "status": "done", "total_offers": 10, "last_fetched_at": "2026-03-28 13:47:45" }
```

Status values: `idle` | `fetching` | `done` | `error`

### `GET /api/jobs/offers` (no auth)

Browse cached offers with optional filters. No scoring, no Gemini call.

```
Query params: ?experience_level=senior&skill=Python&workplace_type=remote&limit=25&offset=0
Response:     JJITOfferOut[]
```

### `GET /api/jobs/scored` (auth required) **← main endpoint**

Returns scored offers for the current user, sorted by score DESC. **Triggers on-demand Gemini scoring** for any unscored offers.

```
Query params: ?experience_level=senior&skill=Python&workplace_type=remote&limit=20
Response:     ScoredOfferOut[]
```

Each `ScoredOfferOut` contains:

```json
{
  "offer": { "slug", "title", "company_name", "required_skills", "salary_display", ... },
  "overall_score": 85,
  "skill_match": {
    "matched": ["Python", "SQL", "Machine Learning"],
    "missing": [],
    "bonus": ["FastAPI", "PostgreSQL", "Docker"]
  },
  "experience_fit": {
    "level_match": "exact",
    "reasoning": "Senior role matches the candidate's extensive data/Python background."
  },
  "suggestions": [
    {
      "type": "project",
      "title": "Highlight data pipeline work",
      "description": "Emphasize the 50M records/day ETL experience during the interview.",
      "priority": "high"
    }
  ],
  "reasoning": "Strong match for skills and seniority, leveraging the candidate's AI/ML background."
}
```

### `GET /api/jobs/detail/{slug}` (auth required)

Full offer detail including HTML body (lazy-fetched from JJIT on first request).

```
Response: {
  "offer": JJITOfferOut,
  "body_html": "<p>Full job description...</p>",
  "company_url": "https://...",
  "company_size": "51-100",
  "apply_url": "https://...",
  "languages": [{"code": "en", "level": "C1"}],
  "score": ScoredOfferOut | null
}
```

### `GET /api/jobs/suggestions` (auth required)

Aggregated "ROI Actions" across all scored offers. Deduplicated by title, sorted by priority.

```
Response: Suggestion[]

[
  { "type": "project",       "title": "Build RAG demo",              "description": "...", "priority": "high" },
  { "type": "certification", "title": "AWS SA Professional",         "description": "...", "priority": "high" },
  { "type": "skill-up",      "title": "Learn PySpark",               "description": "...", "priority": "medium" },
  { "type": "visibility",    "title": "Focus on backend arch roles", "description": "...", "priority": "low" }
]
```

Suggestion types: `skill-up` | `project` | `certification` | `visibility`
Priority levels: `high` | `medium` | `low`

---

## DB Schema (3 new tables)

Added in `db.py` `init_db()`:

```sql
-- Global JustJoinIT offer cache (shared across users)
CREATE TABLE IF NOT EXISTS jjit_offers (
    slug TEXT PRIMARY KEY,          -- unique identifier, used in URLs
    guid TEXT,
    title TEXT NOT NULL,
    company_name TEXT,
    required_skills TEXT,           -- JSON ["Python", "React", ...]
    nice_to_have_skills TEXT,       -- JSON
    experience_level TEXT,          -- junior | mid | senior | c_level
    workplace_type TEXT,            -- remote | hybrid | office
    working_time TEXT,              -- full_time | part_time
    employment_types TEXT,          -- JSON [{from, to, currency, type, unit}]
    category_id INTEGER,
    city TEXT,
    published_at TEXT,
    expired_at TEXT,
    body_html TEXT,                 -- NULL until detail fetched (lazy)
    company_url TEXT,
    company_size TEXT,
    apply_url TEXT,
    languages TEXT,                 -- JSON
    raw_json TEXT,                  -- full API response
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Per-user scoring results
CREATE TABLE IF NOT EXISTS offer_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    offer_slug TEXT NOT NULL REFERENCES jjit_offers(slug),
    overall_score INTEGER NOT NULL,  -- 0-100
    skill_match TEXT,                -- JSON {matched[], missing[], bonus[]}
    experience_fit TEXT,             -- JSON {level_match, reasoning}
    suggestions TEXT,                -- JSON [{type, title, description, priority}]
    reasoning TEXT,
    profile_hash TEXT,               -- MD5 of profile data — invalidates when profile changes
    scored_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, offer_slug)
);

-- Key-value store for background task state
CREATE TABLE IF NOT EXISTS fetch_state (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Files Changed / Added

### New files

| File | Purpose |
|------|---------|
| `backend/services/jjit.py` | JustJoinIT API client — fetch, paginate, cache, detail |
| `backend/services/scorer.py` | Profile assembly, Gemini batch scoring, score storage, suggestion aggregation |
| `backend/services/linkedin.py` | LinkedIn ZIP parser utility (not wired to routes — available for future use) |

### Modified files

| File | What changed |
|------|--------------|
| `backend/db.py` | Added `jjit_offers`, `offer_scores`, `fetch_state` tables |
| `backend/models.py` | Added `JJITOfferOut`, `ScoredOfferOut`, `SkillMatchBreakdown`, `ExperienceFit`, `Suggestion`, `OfferDetailOut`, `FetchStatusOut`, `ScoreFilters` |
| `backend/services/llm.py` | Added `score_offers_against_profile()` function |
| `backend/prompts.yaml` | Added `offer_scoring.system` + `offer_scoring.user` prompts |
| `backend/routes/jobs.py` | Added 6 new endpoints, kept existing 3 (moved `GET ""` to `GET /list` to avoid conflict with new routes) |

### Unchanged files

`main.py`, `routes/profile.py`, `routes/auth.py`, `routes/interview.py`, `routes/debug.py`, `services/scraper.py`, `services/vapi.py`, `services/stitch.py`, `services/auth.py`, `services/prompts.py`, `dependencies.py` — all untouched.

---

## How Gemini Is Used

Single Gemini call per batch of 10-12 offers. The prompt is in `prompts.yaml` under `offer_scoring`.

**Input** (~3500 tokens):
- Compact profile: technologies with proficiency, experience level, role, strengths, LinkedIn positions/skills/certs (~800 tokens)
- Batch of 10-12 offers: title, skills, level, salary, city (~150 tokens each)

**Output** (~2500 tokens):
- JSON array, one object per offer with: `slug`, `overall_score`, `skill_match`, `experience_fit`, `suggestions[]`, `reasoning`

**Scoring rules** (from prompt):
- 90-100: Near-perfect match
- 75-89: Strong match, minor gaps
- 60-74: Moderate, meaningful gaps
- 40-59: Partial, significant gaps
- 0-39: Poor match
- Fuzzy matching: React = ReactJS, Spring Boot implies Java, AWS covers cloud
- LinkedIn job duration > 2 years = stronger signal than hobby projects
- Suggestions capped at 2-3 per offer

**Cache invalidation**: Scores are keyed by `(user_id, offer_slug)` + `profile_hash`. When the profile changes (new GitHub analysis, LinkedIn data update), the hash changes and offers are re-scored on next request.

---

## JustJoinIT API Details

**IMPORTANT**: The v2 API listing endpoint (`https://api.justjoin.it/v2/user-panel/offers`) is **dead as of March 2026** (returns 404). The count/suggest endpoints still work.

We use the **candidate API** instead:

| Endpoint | Method | Notes |
|----------|--------|-------|
| `https://justjoin.it/api/candidate-api/offers` | GET | List offers, cursor pagination, ~10/page |
| `https://justjoin.it/api/candidate-api/offers/{slug}` | GET | Full detail with HTML body |
| `https://api.justjoin.it/v2/user-panel/offers/count` | GET | Total offer count (still works) |
| `https://api.justjoin.it/v2/user-panel/offers/suggest?search=X` | GET | Autocomplete (still works) |

**Pagination**: Cursor-based. Response `meta.next.cursor` → pass as `?cursor=N` on next request.

**No server-side filtering** on the candidate API — filtering is done locally in `get_cached_offers()`.

**Rate limits**: No explicit limits, but Cloudflare CDN is present. We add 1.5s delay between pages.

---

## What's Missing / TODO

### High priority (needed for demo)

- [ ] **Frontend integration** — wire the React dashboard to these endpoints (see wireframe mapping below)
- [ ] **More offers** — currently fetches ~10 per request (1 page). Increase `max_pages` or add a "fetch more" trigger
- [ ] **LinkedIn data ingestion** — `profiles.linkedin_data` column exists and scorer reads it, but there's no route to populate it yet. Options: ZIP upload endpoint, manual paste, or LinkedIn DMA API (EU only)

### Medium priority (polish)

- [ ] **Re-score endpoint** — `POST /api/jobs/{slug}/score` to force re-score a single offer (e.g., after profile update)
- [ ] **Offer expiry cleanup** — delete offers where `expired_at < now()` from the cache
- [ ] **Salary-based sorting** — the data is there in `employment_types` JSON, just needs a sort option
- [ ] **NoFluffJobs integration** — API is free, no auth, always has salary. Parser would be similar to JJIT. See `docs/job-apis.md`
- [ ] **Better error handling** — Gemini failures currently silently return empty results. Should surface errors to frontend
- [ ] **Pagination on /scored** — currently returns up to `limit` results. Needs offset/cursor for "load more"

### Low priority (nice to have)

- [ ] **Score explanation detail view** — richer narrative for the offer detail page (currently just `reasoning` string)
- [ ] **Offer comparison** — side-by-side comparison of 2-3 scored offers
- [ ] **Profile completeness indicator** — show how much scoring data is available (GitHub only? + LinkedIn? + certs?)
- [ ] **Background re-fetch** — periodic refresh of offers (APScheduler or cron). Currently requires manual trigger

---

## Wireframe → API Mapping

### Landing Page (Dashboard)

| UI Element | API Endpoint | Key Fields |
|------------|-------------|------------|
| **Summary / User data** (left) | `GET /api/profile` | `summary`, `technologies[]`, `experience_level`, `primary_role`, `strengths[]` |
| **ROI Actions** (center) | `GET /api/jobs/suggestions` | `type`, `title`, `description`, `priority` |
| **Job offers** with match % (right) | `GET /api/jobs/scored` | `overall_score`, `offer.title`, `offer.company_name`, `offer.salary_display` |
| **Job applications** (bottom) | `GET /api/jobs/list` | existing endpoint |

### Interview Simulation Page

| UI Element | API Endpoint | Key Fields |
|------------|-------------|------------|
| **Job offer summary** (top) | `GET /api/jobs/detail/{slug}` | `offer.*`, `body_html` |
| **Score %** + **good/bad** + **summary** | `GET /api/jobs/detail/{slug}` → `score` | `overall_score`, `skill_match.matched` (good), `skill_match.missing` (bad), `reasoning` (summary) |
| **Suggestions cards** | `GET /api/jobs/detail/{slug}` → `score.suggestions` | `type`, `title`, `description` |
| **Pre-interview suggestions** | `score.skill_match.bonus` + `GET /api/profile` → `notable_projects` | What to mention from your real work |

---

## Quick Start (for development)

```bash
cd backend

# 1. Set up environment
cp .env.example .env
# Add GEMINI_API_KEY to .env (required for scoring)

# 2. Install deps
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 3. Run
uvicorn main:app --reload --port 8000

# 4. Test the flow
TOKEN=$(curl -s -X POST localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Connect GitHub (triggers profile analysis via Gemini)
curl -X POST localhost:8000/api/profile/github \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"YOUR_GITHUB_USERNAME"}'

# Wait ~30s for background analysis to complete, then:

# Fetch offers
curl -X POST localhost:8000/api/jobs/fetch -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{}'

# Wait ~15s for fetch, then:

# Get scored offers (triggers Gemini scoring)
curl localhost:8000/api/jobs/scored -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Get ROI suggestions
curl localhost:8000/api/jobs/suggestions -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

---

## Preview

A self-contained HTML dashboard preview with real Gemini-scored data is at:

```
tests/output/dashboard-preview.html
```

Open in browser to see scored offers, skill breakdowns, and ROI action cards.
