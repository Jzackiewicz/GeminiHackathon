# JustJoinIT (justjoin.it) API -- Developer Documentation

> Last verified: 2026-03-28
> Status: No official public API documentation exists. This is a reverse-engineered reference.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [API Endpoints Reference](#api-endpoints-reference)
3. [Offers List Endpoint (Primary)](#1-offers-list-endpoint-primary)
4. [Offer Detail (via Candidate API proxy)](#2-offer-detail-via-candidate-api-proxy)
5. [Supporting Endpoints](#3-supporting-endpoints)
6. [Data Schemas](#data-schemas)
7. [Filtering and Searching](#filtering-and-searching)
8. [Pagination](#pagination)
9. [Category Reference](#category-reference)
10. [Rate Limits and Caching](#rate-limits-and-caching)
11. [Python Examples](#python-examples)
12. [SSR Data Extraction (Alternative Approach)](#ssr-data-extraction-alternative-approach)
13. [Practical Tips and Gotchas](#practical-tips-and-gotchas)

---

## Architecture Overview

JustJoinIT runs on **Next.js (App Router)** with React Server Components (RSC). There
is NO official public API and NO API documentation. However, two sets of endpoints are
accessible without authentication:

| API Layer | Base URL | Auth Required | Notes |
|-----------|----------|--------------|-------|
| **v2 Backend API** | `https://api.justjoin.it` | No | Main data API. Returns offer lists with filters, counts, suggestions. |
| **Candidate API Proxy** | `https://justjoin.it/api/candidate-api` | No | Next.js route handler proxy. Returns offer details with full description body. |

The old endpoint `https://justjoin.it/api/offers` (used by many older scrapers) **returns
404 as of 2026**. Do not use it.

### Key Infrastructure

- Served behind **Cloudflare** CDN (Warsaw POP)
- Backend is **Express.js** (via `x-powered-by: Express` header)
- Candidate API proxy is a **.NET** service (error format is ASP.NET-style)
- Images served via `imgproxy.justjoinit.tech` and `public.justjoin.it`
- Company logos on `s3.eu-west-1.amazonaws.com/images.justjoin.it`

---

## API Endpoints Reference

### 1. Offers List Endpoint (Primary)

```
GET https://api.justjoin.it/v2/user-panel/offers
```

This is the main endpoint for fetching job listings. No authentication or special headers
required.

#### Minimal curl Example

```bash
curl 'https://api.justjoin.it/v2/user-panel/offers?page=1&perPage=25'
```

#### Full curl Example with Filters

```bash
curl 'https://api.justjoin.it/v2/user-panel/offers?page=1&perPage=25&skills%5B%5D=Python&experienceLevel%5B%5D=senior&remote=true&withSalary=true&sortBy=salary&orderBy=DESC' \
  -H 'Accept: application/json' \
  -H 'version: 2'
```

#### Query Parameters

| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| `page` | int | `1` | Page number (1-indexed) |
| `perPage` | int | `25` | Items per page (max ~100, returns fewer on page 1 due to promoted offer deduplication) |
| `skills[]` | string[] | `skills[]=Python&skills[]=SQL` | Filter by required skills |
| `experienceLevel[]` | string[] | `experienceLevel[]=senior` | Values: `junior`, `mid`, `senior`, `c_level` |
| `remote` | bool | `true` | Filter for remote offers |
| `withSalary` | bool | `true` | Only offers that disclose salary |
| `sortBy` | string | `salary` | Values: `published` (default), `newest`, `salary` |
| `orderBy` | string | `DESC` | Values: `DESC`, `ASC` |
| `categories[]` | int[] | `categories[]=6` | Filter by category ID (see Category Reference) |
| `city` | string | `Krakow` | Filter by city name |
| `salaryCurrencies` | string | `PLN` | Currency for salary conversion display |

#### Response Format

```json
{
  "data": [ /* array of offer objects */ ],
  "meta": {
    "page": 1,
    "totalItems": 10382,
    "totalPages": 416,
    "prevPage": null,
    "nextPage": 2
  }
}
```

#### Offer Object (List View)

```json
{
  "guid": "4ce04fa5-2b1c-4474-920a-22326d5404ee",
  "slug": "codeyourbrand-java-spring-developer-warszawa-java-3a667fd2",
  "title": "Java Spring Developer",
  "requiredSkills": ["Java 17", "Spring Boot 3", "OOP", "SQL", "Git"],
  "niceToHaveSkills": null,
  "workplaceType": "remote",
  "workingTime": "full_time",
  "experienceLevel": "mid",
  "employmentTypes": [
    {
      "from": 10000,
      "to": 16000,
      "currency": "pln",
      "type": "b2b",
      "unit": "month",
      "gross": false,
      "fromChf": 2144.98,
      "fromEur": 2326.52,
      "fromGbp": 2024.71,
      "fromPln": 10000,
      "fromUsd": 2686.19,
      "toChf": 3431.968,
      "toEur": 3722.432,
      "toGbp": 3239.536,
      "toPln": 16000,
      "toUsd": 4297.904
    }
  ],
  "categoryId": 6,
  "multilocation": [
    {
      "city": "Warszawa",
      "slug": "codeyourbrand-java-spring-developer-warszawa-java-3a667fd2",
      "street": "Prosta 10",
      "latitude": 52.2324731,
      "longitude": 20.9928936
    }
  ],
  "city": "Warszawa",
  "street": "Prosta 10",
  "latitude": "52.2324731",
  "longitude": "20.9928936",
  "remoteInterview": true,
  "companyName": "CodeYourBrand",
  "companyLogoThumbUrl": "https://imgproxy.justjoinit.tech/.../h:200/w:200/plain/...",
  "publishedAt": "2026-02-26T11:46:29.593Z",
  "lastPublishedAt": "2026-02-26T11:46:29.593Z",
  "expiredAt": "2026-03-28T11:46:29.593Z",
  "openToHireUkrainians": false,
  "languages": [],
  "applyMethod": "form",
  "isSuperOffer": false,
  "promotedPosition": null,
  "promotedKeyFilters": []
}
```

**NOTE:** The list endpoint does NOT return the full job description (`body`). For that,
use the Offer Detail endpoint below.

---

### 2. Offer Detail (via Candidate API Proxy)

```
GET https://justjoin.it/api/candidate-api/offers/{slug}
```

Returns the complete offer with the full HTML description body.

#### curl Example

```bash
curl 'https://justjoin.it/api/candidate-api/offers/codeyourbrand-java-spring-developer-warszawa-java-3a667fd2' \
  -H 'Accept: application/json'
```

#### Offer Detail Object (additional fields beyond list view)

```json
{
  "id": "fdbee954-0282-494f-b7ad-3ed7e3ffead4",
  "slug": "ergo-technology-services-software-engineer-...",
  "title": "Software Engineer (SAP SuccessFactors) | f/m/d",
  "experienceLevel": "mid",
  "category": {
    "key": "other",
    "parentKey": null
  },
  "companyName": "ERGO Technology & Services",
  "companyUrl": "https://ets-career.com/",
  "body": "<p class=\"ql-header-3\">About Us</p><p>...</p>",
  "locationId": "73356852-0816-44bd-b8dd-6c73a0dd1b07",
  "city": "Warszawa",
  "street": "plac Trzech Krzyzy 10",
  "countryCode": "PL",
  "latitude": 52.2296516,
  "longitude": 21.0227504,
  "companySize": "501+",
  "informationClause": "...(GDPR text)...",
  "futureConsent": "...",
  "customConsent": "",
  "companyLogoUrl": "https://public.justjoin.it/offers/company_logos/original/...",
  "employmentTypes": [
    {
      "from": 10000,
      "fromPerUnit": 10000,
      "to": 16000,
      "toPerUnit": 16000,
      "currency": "PLN",
      "currencySource": "original",
      "type": "b2b",
      "unit": "Month",
      "gross": false
    }
  ],
  "workplaceType": "hybrid",
  "requiredSkills": [
    { "name": "SAP Successfactors", "level": 4 },
    { "name": "SAP HANA", "level": 4 }
  ],
  "niceToHaveSkills": [],
  "workingTime": "full_time",
  "applyUrl": "https://system.erecruiter.pl/...",
  "publishedAt": "2026-03-30T14:00:22.212Z",
  "companyProfileSlug": null,
  "companyProfileCoverPhotoUrl": null,
  "companyProfileShortDescription": null,
  "isOpenToHireUkrainians": false,
  "locations": [
    {
      "city": "Warszawa",
      "street": "plac Trzech Krzyzy 10",
      "latitude": 52.2296516,
      "longitude": 21.0227504,
      "slug": "ergo-technology-services-...-warszawa-other"
    },
    {
      "city": "Gdansk",
      "street": "Leona Droszynskiego 24",
      "latitude": 54.4091216,
      "longitude": 18.5735407,
      "slug": "ergo-technology-services-...-gdansk-other"
    }
  ],
  "videoUrl": null,
  "bannerUrl": null,
  "isOfferActive": true,
  "expiredAt": "2026-05-07T21:59:59.999Z",
  "languages": [
    { "code": "en", "level": "C1" }
  ],
  "guid": "fdbee954-0282-494f-b7ad-3ed7e3ffead4"
}
```

**Key differences from list view:**
- `body` -- Full HTML job description (the main content)
- `companyUrl` -- Company website
- `companySize` -- e.g., "501+", "51-200"
- `countryCode` -- ISO 3166-1 alpha-2 (e.g., "PL")
- `applyUrl` -- Direct application URL (if external)
- `informationClause` -- GDPR data processing clause
- `languages` -- Required language skills with levels
- `locations[]` vs `multilocation[]` -- Same data, different key name
- `requiredSkills` has `level` field (1-5 scale) in detail view
- `employmentTypes` has `fromPerUnit`, `toPerUnit`, `currencySource` in detail view

---

### 3. Supporting Endpoints

#### Offers Count (with filters)

```
GET https://api.justjoin.it/v2/user-panel/offers/count
```

Returns total offer count matching filter criteria. Accepts same filter params as the
offers list. Useful for UI counters or pre-checking result sizes.

```bash
curl 'https://api.justjoin.it/v2/user-panel/offers/count?skills%5B%5D=Python&remote=true'
# Response: {"count":2298}
```

#### Category Offer Counts

```
GET https://api.justjoin.it/v2/user-panel/offers/count/categories
```

Returns offer count per category ID.

```bash
curl 'https://api.justjoin.it/v2/user-panel/offers/count/categories'
# Response: {"counts":{"1":1232,"2":54,...,"25":1133}}
```

#### Search Suggestions (Autocomplete)

```
GET https://api.justjoin.it/v2/user-panel/offers/suggest?search={query}
```

Returns skill names, company names, and job title matches.

```bash
curl 'https://api.justjoin.it/v2/user-panel/offers/suggest?search=react'
```

```json
{
  "skills": [
    { "title": "React" },
    { "title": "Reactive Programming" },
    { "title": "ReactJS" },
    { "title": "React Native" }
  ],
  "companies": [],
  "titles": [
    { "title": "4x Java Full Stack Developer with React" },
    { "title": "AI Senior Fullstack Developer (Java + React)" }
  ]
}
```

Minimum query length: 2 characters.

---

## Data Schemas

### Employment Types (Salary)

```
from           - Minimum salary (number, null if undisclosed)
to             - Maximum salary (number, null if undisclosed)
currency       - "pln", "eur", "usd", "gbp", "chf"
type           - "permanent" | "b2b" | "mandate_contract"
unit           - "month" | "hour" (v2 API); "Month" | "Hour" (candidate API)
gross          - true = gross salary; false = net (typical for B2B)
fromPln/toPln  - Salary converted to PLN (v2 API only)
fromEur/toEur  - Salary converted to EUR (v2 API only)
fromUsd/toUsd  - Salary converted to USD (v2 API only)
fromGbp/toGbp  - Salary converted to GBP (v2 API only)
fromChf/toChf  - Salary converted to CHF (v2 API only)
currencySource - "original" | "conversion" (candidate API detail view only)
```

**Salary interpretation:**

- An offer can have MULTIPLE employment types (e.g., both B2B and permanent contract)
- Each employment type has its own salary range
- `from` and `to` are always in the currency specified by `currency`
- The `from{Currency}` and `to{Currency}` fields give pre-computed conversions
- `null` salary means salary is not disclosed for that employment type
- `gross: true` means gross/brutto; `gross: false` means net/netto (common for B2B)
- B2B salaries in Poland are typically net (before VAT, after costs)

### Workplace Type

```
"remote"   - Fully remote
"hybrid"   - Hybrid (mix of office and remote)
"office"   - Fully on-site
```

### Working Time

```
"full_time"  - Full time
"part_time"  - Part time
"practice"   - Internship/practice
"freelance"  - Freelance
```

### Experience Level

```
"junior"   - Junior
"mid"      - Mid/Regular
"senior"   - Senior
"c_level"  - C-level / Lead / Principal
```

---

## Filtering and Searching

### Filter Parameters (v2 API)

All filter parameters use bracket notation for arrays: `param[]=value1&param[]=value2`
(URL-encoded as `param%5B%5D=value1&param%5B%5D=value2`).

| Filter | Parameter | Values | Example |
|--------|-----------|--------|---------|
| Skills/Technologies | `skills[]` | Any skill string | `skills[]=Python&skills[]=Django` |
| Experience Level | `experienceLevel[]` | `junior`, `mid`, `senior`, `c_level` | `experienceLevel[]=senior` |
| Remote Work | `remote` | `true` | `remote=true` |
| Salary Disclosed | `withSalary` | `true` | `withSalary=true` |
| Category | `categories[]` | Category ID (integer) | `categories[]=6` |
| City | `city` | City name | `city=Krakow` |
| Sort Field | `sortBy` | `published`, `newest`, `salary` | `sortBy=salary` |
| Sort Order | `orderBy` | `DESC`, `ASC` | `orderBy=DESC` |
| Salary Currency | `salaryCurrencies` | `PLN`, `EUR`, `USD`, `GBP`, `CHF` | `salaryCurrencies=PLN` |

### Combining Filters

Filters are AND-combined. Multiple values for the same array parameter are OR-combined.

```bash
# Senior Python OR Java developers, remote, with salary, sorted by highest salary
curl 'https://api.justjoin.it/v2/user-panel/offers?page=1&perPage=25&skills%5B%5D=Python&skills%5B%5D=Java&experienceLevel%5B%5D=senior&remote=true&withSalary=true&sortBy=salary&orderBy=DESC'
```

---

## Pagination

The v2 API uses **page-based pagination** (1-indexed).

```
page     - Page number, starting at 1
perPage  - Items per page (practical max: ~100)
```

### Response Metadata

```json
{
  "meta": {
    "page": 1,
    "totalItems": 10382,
    "totalPages": 416,
    "prevPage": null,
    "nextPage": 2
  }
}
```

### Pagination Behavior

- Page 1 may return fewer items than `perPage` (typically 5 items instead of 25) due
  to promoted/super offers being deduplicated or separated.
- Pages 2+ return the full `perPage` count.
- `totalItems` is capped at approximately 10,000-10,382 even when more offers exist.
  The `count` endpoint reports the true total (~21,000+).
- To get ALL offers, paginate until `nextPage` is `null` or `page >= totalPages`.

---

## Category Reference

| ID | Key | Description |
|----|-----|-------------|
| 1 | javascript | JavaScript |
| 2 | html | HTML/CSS |
| 3 | php | PHP |
| 4 | ruby | Ruby |
| 5 | python | Python |
| 6 | java | Java |
| 7 | net | .NET |
| 8 | scala | Scala |
| 9 | c | C/C++ |
| 10 | mobile | Mobile |
| 11 | testing | Testing/QA |
| 12 | devops | DevOps |
| 13 | admin | SysAdmin |
| 14 | ux | UX/UI Design |
| 15 | pm | Project Management |
| 16 | game | Game Dev |
| 17 | analytics | Analytics / BI |
| 18 | security | Security |
| 19 | data | Data / Big Data |
| 20 | go | Go |
| 21 | support | Support |
| 22 | erp | ERP / SAP |
| 23 | architecture | Architecture |
| 24 | other | Other |
| 25 | ai | AI / ML |

---

## Rate Limits and Caching

### Observed Behavior (as of 2026-03-28)

- **No explicit rate limit headers** are returned (no `X-RateLimit-*` headers).
- Cloudflare CDN caches responses: `cache-control: public, s-maxage=10, stale-while-revalidate=59`
  meaning responses are cached for 10 seconds, stale data served for up to 59 seconds.
- The `cf-cache-status` header indicates cache hits (`HIT`, `REVALIDATED`, `MISS`).

### Recommendations

- Add a **1-2 second delay** between requests as a courtesy, especially for bulk scraping.
- For bulk data collection, paginate with delays. Full scrape of ~10,000 offers at 25/page
  = ~400 requests. At 1 req/sec = ~7 minutes.
- Cache responses locally; data changes infrequently (most offers last weeks).
- Do NOT hammer the API with concurrent requests -- Cloudflare may block your IP.
- Use the `count` endpoint first to estimate result size before paginating.

### Anti-Scraping Measures

- **Cloudflare protection** is present but currently does not challenge simple HTTP
  requests (no JS challenge, no CAPTCHA for API endpoints).
- No authentication tokens or API keys are required.
- No special headers are required (works with a bare `curl` command).
- The API responds to `python-requests` User-Agent without issues.

---

## Python Examples

### Basic: Fetch Offers with Pagination

```python
import requests
import time

BASE_URL = "https://api.justjoin.it/v2/user-panel/offers"

def fetch_all_offers(filters=None, delay=1.0):
    """Fetch all offers with optional filters, handling pagination."""
    params = {
        "page": 1,
        "perPage": 25,
    }
    if filters:
        params.update(filters)

    all_offers = []
    while True:
        response = requests.get(BASE_URL, params=params)
        response.raise_for_status()
        data = response.json()

        offers = data.get("data", [])
        meta = data.get("meta", {})

        all_offers.extend(offers)
        print(f"Page {meta.get('page')}/{meta.get('totalPages')}: "
              f"fetched {len(offers)} offers (total so far: {len(all_offers)})")

        if meta.get("nextPage") is None:
            break

        params["page"] = meta["nextPage"]
        time.sleep(delay)

    return all_offers


# Fetch all remote Python senior offers with salary
offers = fetch_all_offers({
    "skills[]": "Python",
    "experienceLevel[]": "senior",
    "remote": "true",
    "withSalary": "true",
    "sortBy": "salary",
    "orderBy": "DESC",
})

for offer in offers[:5]:
    salary_info = ""
    for et in offer.get("employmentTypes", []):
        if et.get("fromPln"):
            salary_info = f" ({et['fromPln']}-{et['toPln']} PLN/{et['unit']})"
            break
    print(f"{offer['title']} at {offer['companyName']}{salary_info}")
```

### Fetch Offer Details (with Full Description)

```python
import requests
import re

DETAIL_URL = "https://justjoin.it/api/candidate-api/offers/{slug}"

def fetch_offer_detail(slug):
    """Fetch full offer details including HTML description."""
    url = DETAIL_URL.format(slug=slug)
    response = requests.get(url, headers={"Accept": "application/json"})
    response.raise_for_status()
    return response.json()

def strip_html(html_text):
    """Remove HTML tags from description."""
    return re.sub(r'<[^>]+>', '', html_text or '')


detail = fetch_offer_detail("some-offer-slug")
print(f"Title: {detail['title']}")
print(f"Company: {detail['companyName']} ({detail.get('companyUrl', 'N/A')})")
print(f"Skills: {[s['name'] for s in detail.get('requiredSkills', [])]}")
print(f"Description: {strip_html(detail.get('body', ''))[:500]}")
```

### Multiple Skills Filter

```python
import requests

# Use a list of tuples for repeated parameter names
params = [
    ("page", 1),
    ("perPage", 25),
    ("skills[]", "Python"),
    ("skills[]", "Django"),
    ("skills[]", "FastAPI"),
    ("experienceLevel[]", "mid"),
    ("experienceLevel[]", "senior"),
    ("withSalary", "true"),
]

response = requests.get(
    "https://api.justjoin.it/v2/user-panel/offers",
    params=params
)
data = response.json()
print(f"Found {data['meta']['totalItems']} matching offers")
```

---

## Practical Tips and Gotchas

### 1. The Old API is Dead

```
https://justjoin.it/api/offers         -> 404 (dead since ~2025)
https://justjoin.it/api/offers/{id}    -> 404 (dead since ~2025)
```

Many GitHub scrapers and tutorials reference these endpoints. They no longer work.

### 2. Offer Slugs are the Primary Identifiers

Offers are identified by their `slug` (URL-friendly string), not a numeric ID. Use `slug` for fetching
details and constructing offer URLs:

```
https://justjoin.it/job-offer/{slug}
```

### 3. Salary Data Quirks

- Many offers have `null` salary (undisclosed). Use `withSalary=true` to filter these out.
- One offer can have MULTIPLE employment types, each with different salary ranges.
- The v2 API returns pre-computed currency conversions in `from{Currency}`/`to{Currency}` fields.

### 4. Multilocation Offers

Many offers appear in multiple cities. The `multilocation` array lists all locations.
Each location has its own `slug`.

### 5. Headers

No headers are strictly required, but for reliability use:

```
Accept: application/json
```

### 6. totalItems Cap

The `totalItems` in the offers list response is capped around 10,000. The actual total is available via the `count` endpoint:

```bash
curl 'https://api.justjoin.it/v2/user-panel/offers/count'
# {"count":21216}  -- true total
```
