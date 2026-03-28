import "dotenv/config";
import { stitch } from "@google/stitch-sdk";

// Try the lower-level tool API instead of the high-level project.generate()
console.log("--- Test: callTool API ---");

try {
  // List available tools first
  const tools = await stitch.listTools();
  console.log("Available tools:", tools.map(t => t.name).join(", "));
} catch (err) {
  console.error("listTools failed:", err.message);
}

try {
  // Try creating project via callTool
  const project = await stitch.callTool("create_project", { title: "Test Portfolio v2" });
  console.log("Project result:", JSON.stringify(project, null, 2));

  // Try generating via callTool
  const screen = await stitch.callTool("generate_screen", {
    project_id: project?.projectId || project?.id,
    prompt: "A modern dark-themed developer portfolio landing page for Anna Kowalska, Full-Stack Developer. Skills: React, Python, AWS.",
  });
  console.log("Screen result:", JSON.stringify(screen, null, 2));
} catch (err) {
  console.error("callTool failed:", err.message);
  console.error(err);
}
