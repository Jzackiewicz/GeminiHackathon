# LinkedIn API -- Developer Reference

> Last updated: 2026-03-28

> **TL;DR**: The official LinkedIn API is severely restricted. A regular developer can only get name, email, and profile picture via OAuth. Job history, education, and skills are **locked behind partner programs**. For a hackathon, the most practical approach is to have users upload their LinkedIn data export (CSV ZIP file).

---

## 1. What's Actually Available

### Self-Serve (No Approval Needed)

| Product | OAuth Scopes | Data Returned |
|---------|-------------|---------------|
| **Sign In with LinkedIn (OpenID Connect)** | `openid`, `profile`, `email` | name, given_name, family_name, picture, locale, email |
| **Share on LinkedIn** | `w_member_social` | Write-only: post/comment/like on behalf of user |

That's it. There are only two self-serve products.

### What the `/v2/userinfo` Endpoint Returns

```json
{
    "sub": "782bbtaQ",
    "name": "John Doe",
    "given_name": "John",
    "family_name": "Doe",
    "picture": "https://media.licdn-ei.com/dms/image/...",
    "locale": "en-US",
    "email": "doe@email.com",
    "email_verified": true
}
```

### What is NOT Available Without Partner Approval

| Data | Available? |
|------|-----------|
| Name, email, photo | YES |
| Headline | Limited (via `/v2/me`) |
| **Job history / positions** | **NO** |
| **Education** | **NO** |
| **Skills** | **NO** |
| Certifications | NO |
| Summary/About | NO |
| Recommendations | NO |

---

## 2. OAuth Flow (For What's Available)

### Setup

1. Go to https://developer.linkedin.com/
2. Create an app (requires a LinkedIn Company Page)
3. Get Client ID and Client Secret
4. Enable "Sign In with LinkedIn using OpenID Connect" (auto-approved)

### Authorization Flow

```python
# Step 1: Redirect user to LinkedIn
# https://www.linkedin.com/oauth/v2/authorization?
#   response_type=code
#   &client_id=YOUR_CLIENT_ID
#   &redirect_uri=YOUR_REDIRECT_URI
#   &state=RANDOM_STATE
#   &scope=openid%20profile%20email

# Step 2: Exchange code for token
import requests

token_response = requests.post(
    'https://www.linkedin.com/oauth/v2/accessToken',
    data={
        'grant_type': 'authorization_code',
        'code': AUTHORIZATION_CODE,
        'client_id': YOUR_CLIENT_ID,
        'client_secret': YOUR_CLIENT_SECRET,
        'redirect_uri': YOUR_REDIRECT_URI,
    }
)
access_token = token_response.json()['access_token']

# Step 3: Fetch user info
userinfo = requests.get(
    'https://api.linkedin.com/v2/userinfo',
    headers={'Authorization': f'Bearer {access_token}'}
)
print(userinfo.json())
# Returns: sub, name, given_name, family_name, picture, locale, email
```

---

## 3. Getting Rich Profile Data -- Options

### Option A: LinkedIn Data Export Upload (Recommended for Hackathon)

Any LinkedIn user worldwide can download their own data:

1. Go to **Settings & Privacy > Data Privacy > Get a copy of your data**
2. Select specific categories or "The works"
3. Receive a ZIP file (available within ~10 minutes for basic data)

**What's in the ZIP:**

| File | Content |
|------|---------|
| `Positions.csv` | Job history: company, title, description, start/end dates, location |
| `Education.csv` | Schools, degrees, fields of study, dates |
| `Skills.csv` | All listed skills |
| `Certifications.csv` | Certifications with dates and authorities |
| `Profile.csv` | Name, headline, summary, location, industry |
| `Courses.csv` | Courses listed on profile |
| `Languages.csv` | Language proficiencies |
| `Projects.csv` | Projects with descriptions |
| `Honors.csv` | Awards and honors |

**Hackathon strategy:** Build a file upload endpoint that accepts the ZIP, parses the CSVs, and extracts structured profile data. Works for ALL users worldwide, no API approval needed.

```python
import csv
import io
import zipfile


def parse_linkedin_export(zip_path: str) -> dict:
    """Parse a LinkedIn data export ZIP into structured profile data."""
    profile = {
        "positions": [],
        "education": [],
        "skills": [],
        "certifications": [],
        "info": {},
    }

    with zipfile.ZipFile(zip_path, "r") as zf:
        for name in zf.namelist():
            if not name.endswith(".csv"):
                continue

            with zf.open(name) as f:
                reader = csv.DictReader(io.TextIOWrapper(f, encoding="utf-8"))
                rows = list(reader)

            basename = name.split("/")[-1].lower()

            if "position" in basename:
                profile["positions"] = [
                    {
                        "company": r.get("Company Name", ""),
                        "title": r.get("Title", ""),
                        "description": r.get("Description", ""),
                        "location": r.get("Location", ""),
                        "started_on": r.get("Started On", ""),
                        "finished_on": r.get("Finished On", ""),
                    }
                    for r in rows
                ]

            elif "education" in basename:
                profile["education"] = [
                    {
                        "school": r.get("School Name", ""),
                        "degree": r.get("Degree Name", ""),
                        "field": r.get("Notes", ""),
                        "start_date": r.get("Start Date", ""),
                        "end_date": r.get("End Date", ""),
                    }
                    for r in rows
                ]

            elif "skill" in basename:
                profile["skills"] = [r.get("Name", "") for r in rows if r.get("Name")]

            elif "certification" in basename:
                profile["certifications"] = [
                    {
                        "name": r.get("Name", ""),
                        "authority": r.get("Authority", ""),
                        "started_on": r.get("Started On", ""),
                        "finished_on": r.get("Finished On", ""),
                    }
                    for r in rows
                ]

            elif "profile" in basename:
                if rows:
                    r = rows[0]
                    profile["info"] = {
                        "first_name": r.get("First Name", ""),
                        "last_name": r.get("Last Name", ""),
                        "headline": r.get("Headline", ""),
                        "summary": r.get("Summary", ""),
                        "industry": r.get("Industry", ""),
                        "location": r.get("Geo Location", ""),
                    }

    return profile
```

### Option B: EU Data Portability API (DMA)

Under the EU Digital Markets Act, LinkedIn must let EU/EEA/Switzerland members export data to third-party apps.

**What it provides:** Positions, education, skills, certifications, endorsements, recommendations, courses, honors, languages, projects, publications, and more.

**Major restrictions:**
- **EU/EEA/Switzerland members only** (user's LinkedIn profile location)
- **Application review required** (business verification, legal name, registered address)
- **Company Page required** (verified LinkedIn Company Page)
- **Scope:** `r_dma_portability_3rd_party`

**API usage:**
```
GET https://api.linkedin.com/rest/memberSnapshotData?q=criteria&domain=POSITIONS
Header: Linkedin-Version: 202312
Header: Authorization: Bearer <access_token>
```

Available domains: `POSITIONS`, `EDUCATION`, `SKILLS`, `CERTIFICATIONS`, `ENDORSEMENTS`, `RECOMMENDATIONS`, `COURSES`, `HONORS`, `LANGUAGES`, `PATENTS`, `PROJECTS`, `PUBLICATIONS`, `ORGANIZATIONS`, `VOLUNTEERING_EXPERIENCES`, `PROFILE`

**Verdict:** Not realistic for a hackathon due to approval process.

### Option C: Unofficial `linkedin-api` Library (Risky)

```python
# pip install linkedin-api
from linkedin_api import Linkedin

api = Linkedin('user@email.com', 'password')
profile = api.get_profile('some-profile-id')
# Returns: positions, education, skills, certifications, summary, etc.
```

**Warnings:**
- Violates LinkedIn's Terms of Service
- Risk of account suspension
- Requires the user's actual LinkedIn credentials (security concern)
- Not suitable for production or a publicly deployed app

**Verdict:** Don't use this in a hackathon submission. The risk/optics are bad.

### Option D: Third-Party Enrichment Services

Services like Proxycurl can enrich a LinkedIn profile URL with public data:
- Paid: ~$0.01-0.03 per lookup
- Returns publicly visible data (positions, education, skills)
- No LinkedIn API approval needed

**Verdict:** Quick and easy but costs money.

---

## 4. Practical Hackathon Recommendation

**Go with Option A (data export upload)** combined with OAuth for basic auth:

1. Use **Sign In with LinkedIn (OpenID Connect)** for authentication -- gives you name, email, photo
2. Show the user instructions to download their LinkedIn data export
3. Provide a **file upload** endpoint that accepts the ZIP
4. Parse the CSVs to extract positions, education, skills, certifications
5. Merge with any other data sources (GitHub, etc.) for the profile summary

This gives you the richest data with zero API restrictions and works worldwide.

---

## 5. OAuth Scopes Reference

### Available to All Developers
| Scope | Data |
|-------|------|
| `openid` | Required for OIDC authentication |
| `profile` | Name, photo, headline |
| `email` | Email address |
| `w_member_social` | Post/comment/like (write-only) |

### Deprecated / Unavailable
| Scope | Status |
|-------|--------|
| `r_liteprofile` | Replaced by `profile` |
| `r_basicprofile` | V1, no longer valid |
| `r_emailaddress` | Replaced by `email` |
| `r_fullprofile` | Was always partner-only, now closed |
| `r_dma_portability_3rd_party` | EU DMA only, requires approval |

---

## 6. Sources

- [Sign In with LinkedIn using OpenID Connect](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2)
- [Getting Access to LinkedIn APIs](https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access)
- [Profile API](https://learn.microsoft.com/en-us/linkedin/shared/integrations/people/profile-api)
- [Member Data Portability (3rd Party)](https://learn.microsoft.com/en-us/linkedin/dma/member-data-portability/member-data-portability-3rd-party)
- [Downloading Your Account Data](https://www.linkedin.com/help/linkedin/answer/a1339364)
- [LinkedIn Developer Portal](https://developer.linkedin.com/)
