# Job Board APIs — Reference

> Last updated: 2026-03-28

> **TL;DR**: Use Fantastic.jobs LinkedIn API (23K free jobs/mo on RapidAPI) as primary source. NoFluffJobs has an undocumented free API with Polish IT jobs + salary data. Adzuna covers Poland officially. Remotive is zero-setup for remote jobs.

---

## Tier 1: Best for Hackathon

### Fantastic.jobs LinkedIn Jobs API (via RapidAPI)

- **URL:** https://rapidapi.com/fantastic-jobs-fantastic-jobs-default/api/linkedin-job-search-api
- **Auth:** RapidAPI key (`X-RapidAPI-Key` header)
- **Free tier:** 23,000 jobs/month + 250 req/min
- **Paid:** Basic $175/mo (75K jobs), Standard $250/mo
- **Data fields (41+):** title, organization, description, locations, salary, employment type, seniority level, company details (industry, followers, employee count), recruiter info, AI-enriched fields (salary ranges, benefits, experience, remote/hybrid/on-site, visa sponsorship, skills), external apply URL
- **Coverage:** Global, 2M+ LinkedIn jobs/week, 9M+ job board jobs/month
- **Setup:** ~5 min

### NoFluffJobs (Unofficial API — Polish IT Market)

- **Search endpoint:**
  ```
  POST https://nofluffjobs.com/api/search/posting?salaryCurrency=PLN&salaryPeriod=month&limit=20&offset=0
  Content-Type: application/json
  Body: {"criteriaSearch":{}}
  ```
- **Detail endpoint:**
  ```
  GET https://nofluffjobs.com/api/posting/{posting-id}
  ```
- **Auth:** None required
- **Free tier:** Unlimited (undocumented, no explicit rate limits)
- **Data fields:** id, title, company, location, remote status, salary (from/to, currency, contract type — ALWAYS present), category, seniority, technology, requirements (must-have/nice-to-have), full description (HTML), benefits, company info, recruitment process
- **Coverage:** Polish IT market
- **Risk:** Undocumented API, could change without notice
- **Community clients:** `necsord/go-nofluffjobs` (Go), `oskar-j/nofluffapi` (Python)

### Remotive

- **Endpoint:** `GET https://remotive.com/api/remote-jobs`
- **Auth:** None
- **Rate limits:** 2 req/min, recommended max 4 fetches/day
- **Data fields:** id, url, title, company_name, company_logo, category, job_type, publication_date, candidate_required_location, salary, description (HTML)
- **Coverage:** Global remote jobs (~140K+ listings)
- **Docs:** https://github.com/remotive-com/remote-jobs-api
- **Best for:** Quick prototyping, cache and develop against local data

---

## Tier 2: Good Alternatives

### Adzuna (Official, Poland Supported)

- **URL:** https://developer.adzuna.com/
- **Auth:** `app_id` + `app_key` as query params
- **Free tier:** ~250 requests/day, 25 req/min
- **Countries (16):** AU, AT, BR, CA, FR, DE, IN, IT, NL, NZ, **PL**, RU, SG, ZA, UK, US
- **Data fields:** title, company, description (snippet), salary (min/max), location (display_name, lat/lon), category, contract type, creation date, redirect URL
- **Limitations:** Description is snippet only, salary often predicted

### The Muse

- **URL:** https://www.themuse.com/developers/api/v2
- **Auth:** API key as query param
- **Free tier:** 3,600 req/hour (with key), 500/hour (without)
- **Data fields:** title, company, category, level, location, description, publication date
- **Coverage:** Primarily US, major companies
- **Limitations:** No salary data, 20 results/page max

### Arbeitnow

- **Endpoint:** `GET https://www.arbeitnow.com/api/job-board-api`
- **Auth:** None
- **Docs:** https://documenter.getpostman.com/view/18545278/UVJbJdKh
- **Data fields:** title, company, description (HTML), location, remote flag, visa_sponsorship
- **Coverage:** EU/remote focus, sourced from ATS systems
- **Limitations:** No salary data, smaller dataset

---

## Tier 3: Use with Caution

### JSearch (RapidAPI)

- **URL:** https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
- **Free tier:** 200 req/month (too tight for dev + demo)
- **Paid:** $25/mo for 10K requests
- **Coverage:** Worldwide (Google for Jobs aggregator)

### Fantastic.jobs ATS / Career Site Jobs API

- **RapidAPI:** https://rapidapi.com/fantastic-jobs-fantastic-jobs-default/api/active-jobs-db
- **Pricing:** $1-9 per 1,000 jobs
- **Coverage:** 175K+ career sites, 54 ATS platforms, 2.5M+ jobs/month

### Reed.co.uk

- **URL:** https://www.reed.co.uk/developers/Jobseeker
- **Auth:** HTTP Basic (API key as username)
- **Free tier:** 1,000 req/day
- **Coverage:** UK only

### Fantastic.jobs Free APIs

- **Free Internships API:** https://rapidapi.com/fantastic-jobs-fantastic-jobs-default/api/internships-api
- **Free Y Combinator Jobs API:** https://rapidapi.com/fantastic-jobs-fantastic-jobs-default/api/free-y-combinator-jobs-api
- Both free on RapidAPI

---

## Polish Job Boards — API Status

| Board | API? | Status | Alternative |
|-------|------|--------|-------------|
| **NoFluffJobs** | Unofficial (working) | Free, no auth, rich data + salary | Use directly |
| **Just Join IT** | Dead (Sep 2023) | Old endpoint returns 404 | Apify scraper (~$0.80/1K) |
| **Pracuj.pl** | None | No public API | HTML scraping only |
| **Rocket Jobs** | None | Same parent as JJIT | HTML scraping only |
| **Bulldogjob** | None | No public API | HTML scraping only |

---

## Recommended Stack for Hackathon

```
Primary:    Fantastic.jobs LinkedIn API (RapidAPI) — 23K free/mo, global
Polish IT:  NoFluffJobs unofficial API — free, always has salary
Backup:     Adzuna — official, PL supported, free tier
Prototype:  Remotive — zero auth, cache locally
```

**Strategy:** Fetch data early, cache aggressively, develop against cached data to conserve rate limits.
