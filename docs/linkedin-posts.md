# Research: LinkedIn Posts Access

> Last updated: 2026-03-28

> **TL;DR**: Official API cannot read your own posts (`r_member_social` is closed). Best path: LinkedIn Data Export delivers `Shares.csv` with full post history in ~10 minutes. Alternatives: manual paste or screenshot + Gemini Vision.

---

## 1. Official API — Dead End for Posts

### `r_member_social` Scope — CLOSED

The Posts API endpoint exists:
```
GET https://api.linkedin.com/rest/posts?author={encoded PersonURN}&q=author&count=10&sortBy=LAST_MODIFIED
```

But it **requires `r_member_social`** which is:
- Restricted to approved developers only
- **Not accepting new access requests** (confirmed March 2026)
- Not available through Community Management API (that only gives write access via `w_member_social`)

### Community Management API — Write-Only for Members

| Scope | Access | What it does |
|-------|--------|-------------|
| `w_member_social` | Self-serve | Post, comment, like (WRITE only) |
| `w_member_social_feed` | Vetted | Create/modify/delete comments and reactions |
| `r_member_postAnalytics` | Vetted (v202506+) | Post **analytics** (views, impressions) — NOT content |
| `r_member_profileAnalytics` | Vetted (v202504+) | Profile view analytics |
| `r_member_social` | **CLOSED** | Read posts — not accepting requests |

### Approval Requirements (Community Management API)
- Must be a registered legal entity (LLC, Corp, 501(c))
- Business email, legal name, registered address, website, privacy policy
- Development tier: 500 API calls/day, must build integration within 12 months
- Standard tier: Screen recording demo, narrated screencast, compliance review
- **Not feasible for a hackathon**

---

## 2. LinkedIn Data Export — BEST APPROACH

### How to Get It

1. LinkedIn → Settings & Privacy → Data Privacy → "Get a copy of your data"
2. Select "Shares" (for posts) and optionally "Articles"
3. Receive email with download link within **~10 minutes** (for specific categories)
4. Download ZIP file

### What's in the Export

**`Shares.csv`** — All shortform LinkedIn posts:

| Column | Description |
|--------|-------------|
| `Date` | Timestamp of the post |
| `ShareLink` | URL to the LinkedIn post |
| `ShareCommentary` | **Full text content of the post** |
| `SharedUrl` | URL shared in the post (if any) |
| `MediaUrl` | Media attachment URL (if any) |
| `Visibility` | Post visibility setting |

**`Articles/` folder** — Longform LinkedIn articles as individual HTML files.

**Other useful files:**
- `Comments.csv` — Comments you made on other posts
- `Reactions.csv` — Your reactions/likes

### Hackathon Integration

```python
import csv
import io
import zipfile


def parse_linkedin_posts(zip_path: str) -> list[dict]:
    """Extract posts from LinkedIn data export."""
    posts = []
    with zipfile.ZipFile(zip_path, "r") as zf:
        for name in zf.namelist():
            if "shares" in name.lower() and name.endswith(".csv"):
                with zf.open(name) as f:
                    reader = csv.DictReader(io.TextIOWrapper(f, encoding="utf-8"))
                    for row in reader:
                        posts.append({
                            "date": row.get("Date", ""),
                            "text": row.get("ShareCommentary", ""),
                            "url": row.get("ShareLink", ""),
                            "shared_url": row.get("SharedUrl", ""),
                            "media_url": row.get("MediaUrl", ""),
                            "visibility": row.get("Visibility", ""),
                        })
    return posts
```

### Advantages Over API
- **All historical posts** (not just recent)
- Full text, not truncated
- User explicitly consents (GDPR data portability)
- Zero dependencies, zero rate limits, zero legal risk
- 10-min wait can happen while Vapi does voice onboarding

---

## 3. Alternative Approaches

### A. Manual Copy-Paste (Fastest for Demo)
- Provide a text area where users paste 5-20 recent posts
- Zero technical complexity
- Good enough for hackathon demo

### B. Screenshot + Gemini Vision (Flashy for Demo)
1. User takes screenshots of their LinkedIn activity feed
2. Upload to app
3. Gemini extracts post text, dates, engagement metrics
4. Parse into structured data

Gemini Vision OCR accuracy is high for LinkedIn's layout. Impressive for live demo.

### C. Third-Party Services (Risky)

| Service | Status | Risk |
|---------|--------|------|
| Proxycurl | **DEAD** (shut down July 2025, LinkedIn lawsuit) | N/A |
| Apify actors | Working ($1-2/1K posts) | ToS violation, account suspension |
| Unipile | Working (uses session cookies under the hood) | Legal gray area |
| Piloterr | Working ($49/mo, 50 free credits) | Scraping service |

**Not recommended for hackathon** — legal/optics risk outweighs benefit.

### D. LinkedIn RSS Feeds
**Do not exist** for individual user posts. Dead end.

---

## 4. Recommended Hackathon Strategy

| Approach | When to Use | Setup Time |
|----------|-------------|------------|
| **Data Export (Shares.csv)** | Primary — pre-export before demo | 10 min wait, 30 min to code parser |
| **Manual paste** | Fallback for live demo | 5 min to add textarea |
| **Screenshot + Gemini Vision** | Wow factor for judges | 1-2 hours |

**Demo flow:**
1. Pre-export LinkedIn data before hackathon demo
2. Upload ZIP → instant parsing → posts feed into Gemini analysis
3. Show Vapi voice agent referencing actual LinkedIn post content during interview prep

---

## 5. Sources

| # | Source | Trust | Verified |
|---|--------|-------|----------|
| 1 | [Posts API (Microsoft, 2026-03)](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api?view=li-lms-2026-03) | 10/10 | YES |
| 2 | [Increasing Access (Microsoft, 2026-03)](https://learn.microsoft.com/en-us/linkedin/marketing/increasing-access?view=li-lms-2026-03) | 10/10 | YES |
| 3 | [Community Management App Review](https://learn.microsoft.com/en-us/linkedin/marketing/community-management-app-review?view=li-lms-2026-03) | 10/10 | YES |
| 4 | [Download Your Data (LinkedIn Help)](https://www.linkedin.com/help/linkedin/answer/a1339364) | 9/10 | YES |
| 5 | [Proxycurl Shutdown](https://nubela.co/blog/goodbye-proxycurl/) | 10/10 | YES |
| 6 | [Gemini OCR capabilities (Roboflow)](https://blog.roboflow.com/how-to-use-gemini-for-ocr/) | 8/10 | YES |
