# Google Stitch -- Developer Reference

> Last updated: 2026-03-28

> **Important**: Google Stitch is an AI-powered UI design generator, NOT a traditional document engine. It generates HTML pages from natural language prompts. For CV generation, it produces a visually designed HTML page that you then convert to PDF via Puppeteer/wkhtmltopdf. There is NO REST API -- all programmatic access is via MCP protocol, wrapped by the official TypeScript SDK.

---

## 1. What is Google Stitch?

Google Stitch (https://stitch.withgoogle.com) uses Gemini models to generate complete UI designs and production-ready HTML/CSS from text prompts.

**What it generates:**
- Complete, self-contained HTML pages with inline CSS
- High-resolution screenshots (PNG) of the generated design

**What it does NOT do:**
- Generate PDF or DOCX directly (requires conversion)
- Accept structured data / JSON templates (natural language prompts only)
- Provide a REST API

**Underlying models:** Gemini 2.5 Flash (default) and Gemini 2.5 Pro (higher quality)

---

## 2. Authentication

### API Key (Recommended)

1. Go to https://stitch.withgoogle.com
2. Sign in with your Google account
3. Click your profile picture (top-right) > **"Stitch Settings"**
4. Navigate to **"API Keys"** > **"Create API Key"**
5. Copy the key

```bash
export STITCH_API_KEY="your-api-key-here"
```

### OAuth / ADC (Alternative)

```bash
gcloud auth application-default login
export STITCH_ACCESS_TOKEN="your-oauth-token"
export GOOGLE_CLOUD_PROJECT="your-project-id"
```

SDK checks credentials in order: explicit params > `STITCH_API_KEY` env var > `STITCH_ACCESS_TOKEN` + `GOOGLE_CLOUD_PROJECT` env vars.

---

## 3. The TypeScript SDK (Recommended)

### Installation

```bash
npm install @google/stitch-sdk
```

**Requirements:** Node.js >= 18, ESM only (`"type": "module"` in package.json)

### Core Workflow: Create Project -> Generate -> Download

```typescript
import { stitch } from "@google/stitch-sdk";
// STITCH_API_KEY is read from environment automatically

// 1. Create a project (container for designs)
const project = await stitch.createProject("My CVs");

// 2. Generate a screen from a text prompt
const screen = await project.generate(
  "A professional CV/resume page for a software engineer...",
  "DESKTOP"  // device type
);

// 3. Get download URLs
const htmlUrl = await screen.getHtml();    // URL to download HTML file
const imageUrl = await screen.getImage();  // URL to download PNG screenshot
```

### Core Classes

#### `stitch` (root)

| Method | Returns | Description |
|--------|---------|-------------|
| `createProject(title?)` | `Promise<Project>` | Create a new project |
| `projects()` | `Promise<Project[]>` | List all projects |
| `project(id)` | `Project` | Reference a project by ID |

#### `Project`

| Method | Returns | Description |
|--------|---------|-------------|
| `generate(prompt, deviceType?, modelId?)` | `Promise<Screen>` | Generate a new screen from text |
| `screens()` | `Promise<Screen[]>` | List all screens in project |

Properties: `id`, `projectId`

#### `Screen`

| Method | Returns | Description |
|--------|---------|-------------|
| `getHtml()` | `Promise<string>` | Get HTML download URL |
| `getImage()` | `Promise<string>` | Get screenshot download URL |
| `edit(prompt, deviceType?, modelId?)` | `Promise<Screen>` | Edit/modify the screen |
| `variants(prompt, variantOptions, deviceType?, modelId?)` | `Promise<Screen[]>` | Generate design variants |

### Device Types

| Value | Description |
|-------|-------------|
| `"DESKTOP"` | Desktop layout (default) -- **use this for CVs** |
| `"MOBILE"` | Mobile phone layout |
| `"TABLET"` | Tablet layout |
| `"AGNOSTIC"` | Responsive layout |

### Models

| Value | Quality | Monthly Quota |
|-------|---------|---------------|
| `"GEMINI_3_FLASH"` | Good (default) | 350 gen/month |
| `"GEMINI_3_PRO"` | Higher | 200 gen/month |

### Error Handling

```typescript
import { StitchError } from "@google/stitch-sdk";

try {
  const screen = await project.generate("...");
} catch (error) {
  if (error instanceof StitchError) {
    console.error(`Code: ${error.code}, Recoverable: ${error.recoverable}`);
  }
}
```

Error codes: `AUTH_FAILED`, `NOT_FOUND`, `PERMISSION_DENIED`, `RATE_LIMITED` (recoverable), `NETWORK_ERROR` (recoverable), `VALIDATION_ERROR`, `UNKNOWN_ERROR`.

---

## 4. The MCP Server (Direct)

For non-Node.js environments or AI coding assistant integration.

**Server URL:** `https://stitch.googleapis.com/mcp`
**Protocol:** MCP (Model Context Protocol) over Streamable HTTP
**Auth header:** `X-Goog-Api-Key: YOUR-API-KEY`

### Claude Code Configuration

```bash
claude mcp add stitch --transport http https://stitch.googleapis.com/mcp \
  --header "X-Goog-Api-Key: YOUR-API-KEY"
```

### MCP Tools

| Tool | Parameters | Description |
|------|-----------|-------------|
| `create_project` | `title?` | Create a new project |
| `generate_screen_from_text` | `projectId`, `prompt`, `deviceType?`, `modelId?` | Generate a screen |
| `edit_screens` | `projectId`, `selectedScreenIds[]`, `prompt`, `deviceType?`, `modelId?` | Edit existing screens |
| `generate_variants` | `projectId`, `selectedScreenIds[]`, `prompt`, `variantOptions`, `deviceType?`, `modelId?` | Generate design variants |
| `list_projects` | `filter?` | List all projects |
| `get_project` | `name` (format: `projects/{id}`) | Get project details |
| `list_screens` | `projectId` | List screens in project |
| `get_screen` | `name`, `projectId`, `screenId` | Get screen details |

### Variant Options

```json
{
  "variantCount": 3,          // 1-5
  "creativeRange": "EXPLORE", // "REFINE", "EXPLORE", or "REIMAGINE"
  "aspects": ["LAYOUT", "COLOR_SCHEME", "IMAGES", "TEXT_FONT", "TEXT_CONTENT"]
}
```

---

## 5. Python Integration

No official Python SDK exists. Two approaches:

### Option A: Node.js Subprocess Wrapper

```python
import subprocess
import json
import os
import tempfile
import urllib.request


def call_stitch(script: str) -> dict:
    """Execute a TypeScript snippet via Node.js and return parsed JSON."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".mjs", delete=False) as f:
        f.write(script)
        f.flush()
        result = subprocess.run(
            ["node", f.name],
            capture_output=True,
            text=True,
            env={**os.environ, "STITCH_API_KEY": os.environ["STITCH_API_KEY"]},
        )
        os.unlink(f.name)
    if result.returncode != 0:
        raise RuntimeError(f"Stitch error: {result.stderr}")
    return json.loads(result.stdout)


def create_project(title: str) -> str:
    script = f'''
    import {{ stitch }} from "@google/stitch-sdk";
    const project = await stitch.createProject("{title}");
    console.log(JSON.stringify({{ projectId: project.projectId }}));
    '''
    return call_stitch(script)["projectId"]


def generate_cv(project_id: str, prompt: str) -> dict:
    escaped = prompt.replace('"', '\\"').replace("\n", "\\n")
    script = f'''
    import {{ stitch }} from "@google/stitch-sdk";
    const project = stitch.project("{project_id}");
    const screen = await project.generate("{escaped}", "DESKTOP");
    const htmlUrl = await screen.getHtml();
    const imageUrl = await screen.getImage();
    console.log(JSON.stringify({{ htmlUrl, imageUrl, screenId: screen.screenId }}));
    '''
    return call_stitch(script)


def download_file(url: str, output_path: str) -> None:
    urllib.request.urlretrieve(url, output_path)
```

### Option B: Direct MCP Protocol (Experimental)

```python
import json
import os
import urllib.request

STITCH_MCP_URL = "https://stitch.googleapis.com/mcp"
API_KEY = os.environ["STITCH_API_KEY"]


def mcp_request(method: str, params: dict | None = None) -> dict:
    payload = {"jsonrpc": "2.0", "id": 1, "method": method}
    if params:
        payload["params"] = params
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        STITCH_MCP_URL,
        data=data,
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": API_KEY,
        },
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def call_tool(name: str, arguments: dict) -> dict:
    result = mcp_request("tools/call", {"name": name, "arguments": arguments})
    return result.get("result", {})
```

> Note: The direct MCP approach may need session negotiation adjustments. The Node.js wrapper is more reliable.

---

## 6. CV Generation Strategy

### Architecture

```
User Data (JSON) --> Prompt Builder --> Google Stitch --> HTML/PNG --> Puppeteer --> PDF
```

### Step-by-Step

1. **Build a detailed prompt** from the user's profile data (Stitch takes natural language, not JSON)
2. **Call Stitch** to generate the HTML page
3. **Download the HTML** from the returned URL
4. **Convert to PDF** using Puppeteer (`page.pdf()`) or wkhtmltopdf

### Complete Example: Generate CV and Convert to PDF

```typescript
import { stitch } from "@google/stitch-sdk";
import { writeFile } from "fs/promises";
import puppeteer from "puppeteer"; // npm install puppeteer

interface CVData {
  name: string;
  title: string;
  email: string;
  summary: string;
  experience: { role: string; company: string; dates: string; description: string }[];
  education: { degree: string; school: string; year: string }[];
  skills: string[];
}

async function generateCV(data: CVData): Promise<{ htmlPath: string; pdfPath: string }> {
  const project = await stitch.createProject("CV - " + data.name);

  const prompt = `
    Create a professional, modern CV/resume page:

    Name: ${data.name}
    Title: ${data.title}
    Email: ${data.email}

    Summary: ${data.summary}

    Work Experience:
    ${data.experience.map(e => `- ${e.role} at ${e.company} (${e.dates}): ${e.description}`).join("\n    ")}

    Education:
    ${data.education.map(e => `- ${e.degree}, ${e.school} (${e.year})`).join("\n    ")}

    Skills: ${data.skills.join(", ")}

    Design: Clean, professional, single-page A4 layout suitable for printing.
    Two-column layout: contact info and skills on the left sidebar,
    experience and education on the right. Navy blue (#1a237e) accents,
    white background. No scrolling required.
  `;

  const screen = await project.generate(prompt, "DESKTOP", "GEMINI_3_PRO");
  const htmlUrl = await screen.getHtml();

  // Download HTML
  const htmlResponse = await fetch(htmlUrl);
  const html = await htmlResponse.text();
  const slug = data.name.toLowerCase().replace(/\s+/g, "-");
  const htmlPath = `${slug}-cv.html`;
  await writeFile(htmlPath, html);

  // Convert to PDF
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  const pdfPath = `${slug}-cv.pdf`;
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: "0", bottom: "0", left: "0", right: "0" }
  });
  await browser.close();

  return { htmlPath, pdfPath };
}
```

### Prompt Engineering Tips for CVs

- Be **extremely specific** about layout: "two-column layout", "sidebar on the left"
- Specify **colors explicitly**: "navy blue (#1a237e) header, white background"
- Mention **print-friendliness**: "single-page layout suitable for A4 printing"
- Include **all content** in the prompt -- Stitch uses exactly what you provide
- Use `GEMINI_3_PRO` model when design quality matters
- Generate **variants** to give users a choice of designs

---

## 7. Rate Limits and Pricing

**Pricing: Completely free** (Google Labs experiment).

| Model | Generations/Month |
|-------|-------------------|
| Gemini Flash (standard) | 350 |
| Gemini Pro (higher quality) | 200 |
| **Total** | **550** |

Quotas reset monthly. If you get `RATE_LIMITED`, back off and retry.

---

## 8. Quick Start Checklist

```
[ ] Sign up at https://stitch.withgoogle.com
[ ] Generate API key: Settings > API Keys > Create
[ ] export STITCH_API_KEY="your-key"
[ ] npm init -y && npm install @google/stitch-sdk
[ ] Add "type": "module" to package.json
[ ] npm install puppeteer  (for PDF conversion)
```
