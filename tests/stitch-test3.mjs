import "dotenv/config";
import { stitch } from "@google/stitch-sdk";

// Get the raw tools list to find correct tool names
try {
  const result = await stitch.callTool("list_tools", {});
  console.log("list_tools result:", JSON.stringify(result, null, 2));
} catch (e) {
  console.log("list_tools failed:", e.message);
}

// Try accessing the internal client to list MCP tools
try {
  const client = stitch;
  // Check what properties/methods are available
  console.log("\nStitch keys:", Object.keys(stitch));
  console.log("Stitch proto:", Object.getOwnPropertyNames(Object.getPrototypeOf(stitch)));

  // Try the _client or internal MCP client
  if (stitch._client) {
    const tools = await stitch._client.listTools();
    console.log("\nMCP tools:", JSON.stringify(tools, null, 2));
  }
} catch (e) {
  console.log("Introspection error:", e.message);
}

// Try common MCP tool name patterns
const guesses = ["generate", "generate_screens", "create_screen", "design_screen", "stitch_generate"];
const projectId = "9751025986035585989";

for (const name of guesses) {
  try {
    const r = await stitch.callTool(name, { project_id: projectId, prompt: "A simple landing page" });
    console.log(`\n${name} WORKED:`, JSON.stringify(r, null, 2).substring(0, 300));
    break;
  } catch (e) {
    console.log(`${name}: ${e.message.substring(0, 80)}`);
  }
}
