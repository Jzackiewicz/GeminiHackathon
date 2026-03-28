import "dotenv/config";
import { stitch } from "@google/stitch-sdk";

console.log("--- Direct callTool: generate_screen_from_text ---");

try {
  // Use existing project or create new one
  const project = await stitch.callTool("create_project", { title: "Direct Test" });
  const projectId = project.name.replace("projects/", "");
  console.log("Project ID:", projectId);

  const start = Date.now();
  const raw = await stitch.callTool("generate_screen_from_text", {
    projectId,
    prompt: "A modern dark-themed developer portfolio landing page for Anna Kowalska, Full-Stack Developer. Skills: React, Python, AWS. 3 featured projects as cards. Contact section.",
    deviceType: "DESKTOP",
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`Generated in ${elapsed}s`);
  console.log("\nRaw response structure:");
  console.log(JSON.stringify(raw, null, 2).substring(0, 3000));

  // Try to find screen data and HTML in the response
  if (raw.screens) console.log("\n-> Found raw.screens");
  if (raw.outputComponents) console.log("\n-> Found raw.outputComponents");
  if (raw.design) console.log("\n-> Found raw.design");

} catch (err) {
  console.error("FAIL:", err.message);
  console.error(err);
}
