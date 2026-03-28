/**
 * Stitch CV/portfolio generator — called from Python via subprocess.
 *
 * Usage:  node stitch_generate.mjs '{"prompt": "...", "title": "..."}'
 * Env:    STITCH_API_KEY must be set.
 * Output: JSON on stdout  { html, screenshotUrl, elapsed }
 *
 * Uses callTool workaround (SDK v0.0.3 high-level API is broken).
 */
import { stitch } from "@google/stitch-sdk";

const input = JSON.parse(process.argv[2]);
const { prompt, title = "CV Generation", deviceType = "DESKTOP" } = input;

if (!prompt) {
  console.error(JSON.stringify({ error: "prompt is required" }));
  process.exit(1);
}

try {
  const project = await stitch.callTool("create_project", { title });
  const projectId = project.name.replace("projects/", "");

  const start = Date.now();
  const raw = await stitch.callTool("generate_screen_from_text", {
    projectId,
    prompt,
    deviceType,
    modelId: "GEMINI_3_FLASH",
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  // Find the design component with screens
  let screen = null;
  for (const comp of raw.outputComponents || []) {
    if (comp.design?.screens?.length > 0) {
      screen = comp.design.screens[0];
      break;
    }
  }

  if (!screen) {
    console.log(JSON.stringify({ error: "No screen found in Stitch response" }));
    process.exit(1);
  }

  // Download HTML
  let html = null;
  if (screen.htmlCode?.downloadUrl) {
    const resp = await fetch(screen.htmlCode.downloadUrl);
    html = await resp.text();
  }

  const screenshotUrl = screen.screenshot?.downloadUrl || null;

  console.log(JSON.stringify({ html, screenshotUrl, elapsed }));
} catch (err) {
  console.log(JSON.stringify({ error: err.message || String(err) }));
  process.exit(1);
}
