# Research: Google Stitch for Automated Portfolio/CV Website Generation

**Date:** 2026-03-28
**Scope:** Can Stitch SDK programmatically generate portfolio websites from user data for a hackathon POC?
**Verdict:** YES, CONFIRMED WORKING — use `callTool` workaround (high-level API is broken). Pre-generate portfolios (~2 min each).

## Key Findings

1. **Stitch SDK exists and is official** — `npm i @google/stitch-sdk`, released March 10-16, 2026. TypeScript, v0.0.3. Generates screens from text prompts and returns HTML. [SDK repo](https://github.com/google-labs-code/stitch-sdk)
2. **API key generation has known bugs** — Multiple users report keys not appearing after creation. Acknowledged by Google on March 13, not confirmed resolved. [Forum thread](https://discuss.ai.google.dev/t/the-key-was-successfully-created-but-no-available-keys-are-displayed/130641)
3. **Rate limits: ~350 generations/month (Standard) / ~50 (Experimental)** — Undocumented officially, widely reported. For a hackathon POC with 2-3 test profiles, plenty. For live demo with judges testing, budget ~50 max. [Pricing analysis](https://www.nxcode.io/resources/news/google-stitch-pricing-plans-complete-guide-2026)
4. **SDK is v0.0.3 — expect rough edges.** Released 18 days ago, 3 versions in 32 hours. Forum has unanswered rate limit questions. Alpha-quality software.
5. **Generates HTML + Tailwind CSS, exportable as React** — perfect for a portfolio site. Can generate, edit, get HTML, and chain screens together.

## Tested Spike Results (2026-03-28)

### What works
- **API key generation:** PASS (worked on first try)
- **SDK connection:** PASS (`stitch.projects()` and `stitch.callTool("create_project", ...)` work)
- **Screen generation:** PASS via `callTool("generate_screen_from_text", ...)` workaround
- **HTML quality:** PASS — 14-25KB self-contained HTML+Tailwind, professional dark portfolios
- **Parameterized prompts:** PASS — different profiles produce completely different outputs
- **Content accuracy:** PASS — user name, all skills, all projects correctly included in output
- **Design system:** Auto-generated per portfolio (color tokens, typography, spacing rules)

### What's broken
- **`project.generate()` crashes** — SDK bug: expects `outputComponents[0].design.screens[0]` but screens are at `outputComponents[1].design.screens[0]`. Use `callTool` directly.
- **`stitch.listTools()` crashes** — returns non-iterable. Use tool definitions from SDK source instead.
- **`list_screens` returns empty** — screens exist only in the generation response, not persisted to project

### Performance
- **Latency: ~112-124s per generation** — too slow for live generation during demo
- **Strategy: pre-generate** portfolios for test profiles, show one cached result instantly, trigger one live generation in background during demo

### Response structure
```
outputComponents[0] = { designSystem: { ... } }     // design tokens
outputComponents[1] = { design: { screens: [...] } } // THE SCREEN (htmlCode, screenshot)
outputComponents[2] = { text: "..." }                 // assistant commentary
outputComponents[3-5] = { suggestion: "..." }         // follow-up suggestions
```

Screen object contains:
- `htmlCode.downloadUrl` — fetch to get HTML string
- `screenshot.downloadUrl` — PNG preview image
- `id`, `title`, `prompt`, `width`, `height`

## Working Code Pattern (use this, not the high-level API)

```typescript
import "dotenv/config";
import { stitch } from "@google/stitch-sdk";

async function generatePortfolio(prompt, projectTitle, deviceType = "DESKTOP") {
  const project = await stitch.callTool("create_project", { title: projectTitle });
  const projectId = project.name.replace("projects/", "");

  const raw = await stitch.callTool("generate_screen_from_text", {
    projectId,
    prompt,
    deviceType,
    modelId: "GEMINI_3_FLASH",
  });

  // Find the design component with screens (index varies)
  let screen = null;
  for (const comp of raw.outputComponents || []) {
    if (comp.design?.screens?.length > 0) {
      screen = comp.design.screens[0];
      break;
    }
  }
  if (!screen) throw new Error("No screen found in response");

  // Download HTML
  const resp = await fetch(screen.htmlCode.downloadUrl);
  const html = await resp.text();
  const screenshotUrl = screen.screenshot?.downloadUrl || null;

  return { html, screenshotUrl };
}
```

### Prompt Template Strategy

```
"A professional single-page portfolio website for {name}, {title}.
Skills: {skills}. Projects: {projects}.
Tailored for a {job_role} position at {company}.
Emphasize these skills: {required_skills}.
Style: modern, dark theme, single page, responsive."
```

Gemini matches job requirements to user data, fills the template, Stitch renders it.

## SDK Reference

**Installation:**
```bash
npm install @google/stitch-sdk
```

**Authentication:** Set `STITCH_API_KEY` env var, or pass explicitly:
```typescript
import { StitchToolClient } from "@google/stitch-sdk";
const client = new StitchToolClient({ apiKey: "your-api-key" });
```

**Core Methods (high-level — BROKEN in v0.0.3, do not use):**
- `project.generate()` — CRASHES, use `callTool` instead
- `stitch.listTools()` — CRASHES

**MCP Tool Names (use via `stitch.callTool(name, args)` — WORKING):**
- `create_project` — `{ title }` → returns `{ name: "projects/{id}", ... }`
- `generate_screen_from_text` — `{ projectId, prompt, deviceType?, modelId? }` → returns full outputComponents
- `edit_screens` — `{ projectId, selectedScreenIds, prompt, deviceType?, modelId? }`
- `generate_variants` — `{ projectId, selectedScreenIds, prompt, variantOptions }`
- `list_projects` — `{ filter? }`
- `list_screens` — `{ projectId }` (NOTE: may return empty even after generation)
- `get_screen` — `{ name, projectId, screenId }`
- `get_project` — `{ name }`

**Device Types:** `MOBILE`, `DESKTOP`, `TABLET`, `AGNOSTIC`
**Model IDs:** `GEMINI_3_PRO`, `GEMINI_3_FLASH`

**Agent/Tool API:**
- `stitch.callTool(name, args)` — Call MCP tool directly
- `stitch.listTools()` — List available tools

## Main Pitfalls (updated after testing)

| Pitfall | Severity | Status | Mitigation |
|---------|----------|--------|------------|
| API key generation bugs | ~~HIGH~~ | RESOLVED — key worked for us | N/A |
| `project.generate()` broken | HIGH | CONFIRMED BUG | Use `callTool("generate_screen_from_text")` directly |
| Latency ~2 min per generation | HIGH | CONFIRMED | Pre-generate all portfolios, cache HTML. One background generation for live demo. |
| Rate limits unclear (~350/mo) | MEDIUM | UNVERIFIED | We used ~5 generations in testing. Budget carefully. |
| Generation quality | ~~MEDIUM~~ | RESOLVED — quality is excellent | Prompts work well, all user data correctly included |

## Backup Plan: Gemini HTML Generation (No Stitch)

If Stitch API key doesn't work or SDK is too unstable:

```typescript
const portfolio = await gemini.generateContent(
  `Generate a complete, styled HTML portfolio page with inline Tailwind CSS for:
   Name: ${name}, Role: ${role}, Skills: ${skills}, Projects: ${projects}.
   Make it a single-page, modern, dark-themed portfolio. Return ONLY the HTML.`
);
```

Less polished but zero dependencies — Gemini is already in the stack.

## Hackathon Strategy

1. Go to stitch.withgoogle.com -> Settings -> API Keys -> Create Key. If it works, proceed. If not, use Gemini HTML fallback.
2. Install SDK: `npm i @google/stitch-sdk`
3. Test one generation — simple portfolio page from a prompt. Verify `getHtml()` returns usable HTML.
4. Pre-generate 2-3 test profiles and cache the HTML so judges can browse instantly.
5. Save one live generation for the demo — the "wow" moment.

Using Stitch scores extra points: it's a Google tool, brand new (March 2026), shows you're using the latest from the ecosystem.

## Open Questions

- ~~Is the API key bug fixed as of today (March 28)?~~ YES, worked for us.
- Exact rate limits for SDK usage vs. web UI — might be different quotas. We've used ~5 generations so far.
- Can you pass a `DESIGN.md` to enforce consistent styling across all generated portfolios? March update mentions this feature but SDK docs don't cover it yet.
- Can `edit_screens` be used to refine a generated portfolio (e.g., "add a section about interview preparation")? Not tested yet.

## Source Registry

| # | Source | Type | Trust | Verified | Notes |
|---|--------|------|-------|----------|-------|
| 1 | [Stitch SDK GitHub](https://github.com/google-labs-code/stitch-sdk) | Official repo | 9/10 | YES | v0.0.3, March 2026 |
| 2 | [Stitch SDK releases](https://github.com/google-labs-code/stitch-sdk/releases) | Official | 9/10 | YES | v0.0.1-0.0.3 in 32hrs |
| 3 | [API key bug report](https://discuss.ai.google.dev/t/the-key-was-successfully-created-but-no-available-keys-are-displayed/130641) | Forum | 6/10 | YES | Unresolved as of Mar 13 |
| 4 | [Calling Stitch from API](https://discuss.ai.google.dev/t/calling-stitch-from-api/92703) | Forum | 6/10 | YES | Pre-SDK, now outdated |
| 5 | [Stitch pricing/limits](https://www.nxcode.io/resources/news/google-stitch-pricing-plans-complete-guide-2026) | Tech blog | 5/10 | PARTIAL | 350/50 limits unconfirmed |
| 6 | [Stitch March 2026 update](https://siliconangle.com/2026/03/19/google-upgrades-stitch-ai-interface-development-tool/) | Tech news | 7/10 | YES | Multi-screen, MCP, SDK |
| 7 | [Stitch official site](https://stitch.withgoogle.com/) | Official | 9/10 | YES | Free during Labs phase |
