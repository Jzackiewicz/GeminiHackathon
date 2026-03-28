import "dotenv/config";
import { stitch } from "@google/stitch-sdk";
import { writeFileSync } from "fs";

// Use the project we just created
const projectId = "12251250803878123330";

console.log("--- Listing screens from generated project ---");
try {
  const raw = await stitch.callTool("list_screens", { projectId });
  console.log("Screens response:", JSON.stringify(raw, null, 2).substring(0, 2000));

  if (raw.screens && raw.screens.length > 0) {
    const screenId = raw.screens[0].screenId || raw.screens[0].name?.split("/").pop();
    console.log("\nFirst screen ID:", screenId);

    // Get the screen details
    const screen = await stitch.callTool("get_screen", {
      name: `projects/${projectId}/screens/${screenId}`,
      projectId,
      screenId,
    });
    console.log("\nScreen details:", JSON.stringify(screen, null, 2).substring(0, 3000));

    // Check for HTML download URL
    if (screen.htmlUri) {
      console.log("\nHTML URI:", screen.htmlUri);
      const resp = await fetch(screen.htmlUri);
      const html = await resp.text();
      writeFileSync("tests/output/portfolio-direct.html", html);
      console.log(`Saved HTML (${html.length} chars) to tests/output/portfolio-direct.html`);
    }
    if (screen.imageUri) {
      console.log("Image URI:", screen.imageUri);
    }
  }
} catch (err) {
  console.error("FAIL:", err.message);
  console.error(err);
}
