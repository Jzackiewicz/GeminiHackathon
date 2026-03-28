# InterviewAI - AI-Powered Job Interview Simulator & CV Generator

## Idea

Help users find a job and prepare for interviews. The app scrapes the user's existing profiles (GitHub, LinkedIn, etc.), matches them with job offers, conducts a mock voice interview, and generates a tailored CV.

## Flow (loose -- subject to change)

1. **Register / Sign In** (email, GitHub OAuth, Google OAuth -- TBD)
2. **Connect data sources** -- GitHub, LinkedIn, possibly others. Scrape them to build a profile summary: technologies, estimated experience levels
3. **Find a job offer** -- two paths:
   - **Voice**: VAPI agent asks the user about their preferences while JustJoinIT (or other aggregators) is scraped in the background. Agent proposes ~3 matching offers. User picks one.
   - **Manual**: User pastes a job listing URL
4. **Mock interview** (gated on step 3) -- VAPI voice agent conducts a technical interview tailored to the user's profile and the selected job
5. **Generate CV** via Google Stitch (only step 3 is mandatory) -- uses profile data, job requirements, and optionally interview highlights

Steps 2-5 are non-sequential (dashboard). Only step 3 is required before 4 and 5.

## Tech Stack (tentative)

- **Backend**: Python / FastAPI, SQLite
- **Frontend**: React / Vite / Tailwind
- **Voice**: VAPI.ai (@vapi-ai/web for browser WebRTC, vapi_server_sdk for backend)
- **CV generation**: Google Stitch (MCP / TypeScript SDK + Puppeteer for PDF)
- **External data**: GitHub API, JustJoinIT API, LinkedIn (data export upload -- API is too restricted)

## API Docs

Detailed references for all external services:

- `docs/vapi-api.md` -- VAPI.ai voice agents (assistants, WebRTC calls, transcripts)
- `docs/github-api.md` -- GitHub REST API (profile, repos, languages, activity)
- `docs/justjoinit-api.md` -- JustJoinIT job board (listings, filtering, details)
- `docs/google-stitch.md` -- Google Stitch (MCP-based UI/CV generation, HTML-to-PDF)
- `docs/linkedin-api.md` -- LinkedIn (OAuth limitations, data export parsing)

## Env Vars

```
VAPI_API_KEY=          # VAPI private key (server-side)
VAPI_PUBLIC_KEY=       # VAPI public key (client-side)
GITHUB_TOKEN=          # GitHub PAT (optional, 5000 req/hr vs 60)
STITCH_API_KEY=        # Google Stitch API key
JWT_SECRET=            # JWT signing secret
```
