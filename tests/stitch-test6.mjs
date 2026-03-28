import "dotenv/config";
import { stitch } from "@google/stitch-sdk";
import { writeFileSync } from "fs";

console.log("--- Full response dump from generate_screen_from_text ---");

const project = await stitch.callTool("create_project", { title: "Full Dump Test" });
const projectId = project.name.replace("projects/", "");
console.log("Project ID:", projectId);

const start = Date.now();
const raw = await stitch.callTool("generate_screen_from_text", {
  projectId,
  prompt: "A simple dark portfolio page for Anna Kowalska, developer. Skills: React, Python. Two project cards.",
  deviceType: "DESKTOP",
  modelId: "GEMINI_3_FLASH",
});
const elapsed = ((Date.now() - start) / 1000).toFixed(1);
console.log(`Generated in ${elapsed}s`);

// Dump the full response to a file for inspection
writeFileSync("tests/output/raw-response.json", JSON.stringify(raw, null, 2));
console.log("Full response saved to tests/output/raw-response.json");

// Walk the structure to find screens and HTML
function findKeys(obj, path = "") {
  if (!obj || typeof obj !== "object") return;
  for (const key of Object.keys(obj)) {
    const p = path ? `${path}.${key}` : key;
    const val = obj[key];
    if (key === "htmlUri" || key === "html" || key === "imageUri" || key === "screenId" || key === "screens") {
      console.log(`  Found: ${p} = ${typeof val === "string" ? val.substring(0, 200) : JSON.stringify(val).substring(0, 200)}`);
    }
    if (typeof val === "object" && val !== null) {
      findKeys(val, p);
    }
  }
}

console.log("\nKey fields in response:");
findKeys(raw);
