# Plan: Stitch SDK Spike — Prove or Kill in 30 Minutes

## Context
We need to validate whether Google Stitch SDK can programmatically generate portfolio/CV websites before committing to it as a core feature of the hackathon project. The SDK is 18 days old (v0.0.3) with known API key bugs. Goal: prove it works or discard it and switch to Gemini HTML fallback — fast.

## Steps

### Step 1: Init Node project + install SDK (~2 min)
- `npm init -y` in project root
- `npm install @google/stitch-sdk`
- Verify package installed: check `node_modules/@google/stitch-sdk`

### Step 2: API Key — the gate check (~3 min)
- User goes to https://stitch.withgoogle.com → profile icon → Stitch Settings → API Keys → Create Key
- If key appears: copy it, export as `STITCH_API_KEY` env var
- If key doesn't appear (known bug): try hard refresh, logout/login, different browser
- **KILL GATE:** If no key after 5 min → skip to Step 6 (Gemini fallback), Stitch is dead for this hackathon

### Step 3: Minimal connection test (~3 min)
Create `tests/stitch-test.mjs`:
```javascript
import { stitch } from "@google/stitch-sdk";
const projects = await stitch.projects();
console.log("Connected! Projects:", projects.length);
```
Run: `STITCH_API_KEY=xxx node tests/stitch-test.mjs`
- **PASS:** prints project count → proceed
- **FAIL:** log error, check if auth issue vs SDK bug → if unfixable in 2 min, go to Step 6

### Step 4: Generate a single portfolio screen (~5 min)
Extend test to generate one screen:
```javascript
const project = await stitch.createProject("Test Portfolio");
const screen = await project.generate(
  "A modern dark-themed developer portfolio landing page for Anna Kowalska, " +
  "Full-Stack Developer. Skills: React, Python, AWS. " +
  "3 featured projects shown as cards. Contact section at bottom."
);
const html = await screen.getHtml();
console.log("HTML URL:", html);
```
- **PASS:** get an HTML URL, fetch it, inspect the output quality
- **FAIL:** log error → if generation timeout or quota error, go to Step 6

### Step 5: Full portfolio test — parameterized prompt (~10 min)
Create `tests/stitch-portfolio.mjs` with a template function:
```javascript
function buildPrompt(userData, jobData) {
  return `A professional portfolio page for ${userData.name}, ${userData.title}. ` +
    `Skills: ${userData.skills.join(", ")}. ` +
    `Projects: ${userData.projects.map(p => p.name + " (" + p.tech + ")").join(", ")}. ` +
    `Tailored for: ${jobData.role} at ${jobData.company}. ` +
    `Emphasize: ${jobData.requiredSkills.join(", ")}. ` +
    `Style: modern, dark theme, single page.`;
}
```
Test with 2 different mock profiles to verify:
- [ ] Output is different per profile (not generic)
- [ ] HTML is self-contained and renderable in browser
- [ ] Skills matching from job data actually reflects in the output
- [ ] Generation time (measure it — need <30s for demo)

Save HTML outputs to `tests/output/` and open in browser to visually inspect.

### Step 6: Gemini HTML fallback test (only if Stitch fails) (~10 min)
- Install `@google/generative-ai`
- Test Gemini generating a complete HTML portfolio from the same prompt
- Compare output quality — likely less polished but zero external dependency risk

### Step 7: Decision + document results (~2 min)
Update `docs/research-stitch.md` with:
- API key: worked / didn't work
- Generation quality: good / mediocre / bad
- Latency per generation
- Decision: USE STITCH / USE GEMINI FALLBACK / HYBRID

## Verification Criteria (pass/fail)
| Check | Pass | Fail |
|-------|------|------|
| API key generates | Key appears in settings | Bug still present |
| SDK connects | `projects()` returns without error | Auth or network error |
| Screen generates | `getHtml()` returns a URL | Timeout, quota, or SDK error |
| HTML is usable | Renders in browser, looks like a portfolio | Broken HTML or generic output |
| Parameterized prompts work | Different profiles → different outputs | Same generic output regardless |
| Latency acceptable | <30s per generation | >60s |

## Files to create
- `tests/stitch-test.mjs` — connection + basic generation test
- `tests/stitch-portfolio.mjs` — parameterized portfolio generation
- `tests/output/` — generated HTML files for visual inspection
- (if fallback needed) `tests/gemini-fallback.mjs`
