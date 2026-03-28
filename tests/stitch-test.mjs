import "dotenv/config";
import { stitch } from "@google/stitch-sdk";

console.log("--- Step 3: Connection Test ---");
try {
  const projects = await stitch.projects();
  console.log(`PASS: Connected! Found ${projects.length} existing project(s).`);
} catch (err) {
  console.error("FAIL: Connection error:", err.message);
  process.exit(1);
}

console.log("\n--- Step 4: Single Portfolio Generation ---");
const start = Date.now();
try {
  const project = await stitch.createProject("Test Portfolio");
  console.log(`Project created: ${project.id ?? "OK"}`);

  const screen = await project.generate(
    "A modern dark-themed developer portfolio landing page for Anna Kowalska, " +
      "Full-Stack Developer. Skills: React, Python, AWS. " +
      "3 featured projects shown as cards. Contact section at bottom."
  );
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`Screen generated in ${elapsed}s`);

  const html = await screen.getHtml();
  console.log("HTML URL:", html);

  const image = await screen.getImage();
  console.log("Image URL:", image);

  // Fetch and save the HTML
  if (html) {
    const resp = await fetch(html);
    const htmlContent = await resp.text();
    const fs = await import("fs");
    fs.writeFileSync("tests/output/portfolio-test.html", htmlContent);
    console.log(
      `PASS: HTML saved to tests/output/portfolio-test.html (${htmlContent.length} chars)`
    );
  }
} catch (err) {
  console.error("FAIL: Generation error:", err.message);
  console.error(err);
  process.exit(1);
}
