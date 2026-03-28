/**
 * LinkedIn DMA Member Data Portability — Direct Token Test
 * Uses a pre-generated access token (from Token Generator) to test all DMA domains.
 *
 * Usage: Paste your token in .env as LINKEDIN_ACCESS_TOKEN, then run:
 *   node tests/linkedin-dma-direct.mjs
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load env
const envPath = resolve(import.meta.dirname, "../.env");
try {
  const envFile = readFileSync(envPath, "utf-8");
  for (const line of envFile.split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) {
      let val = rest.join("=").trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key.trim()] = val;
    }
  }
} catch {
  console.error("No .env file found");
  process.exit(1);
}

const TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
if (!TOKEN) {
  console.error("Missing LINKEDIN_ACCESS_TOKEN in .env");
  process.exit(1);
}

// All DMA snapshot domains
const DMA_DOMAINS = [
  "MEMBER_SHARE_INFO",   // Posts!
  "ARTICLES",            // Longform articles
  "PROFILE",             // Basic profile
  "POSITIONS",           // Job history
  "EDUCATION",           // Education
  "SKILLS",              // Skills
  "CERTIFICATIONS",      // Certifications
  "ALL_COMMENTS",        // Comments on posts
  "ALL_LIKES",           // Reactions
  "INSTANT_REPOSTS",     // Reposts
  "RICH_MEDIA",          // Photos/videos/docs
];

// Standard endpoints for comparison
const STANDARD_ENDPOINTS = [
  { name: "UserInfo (OIDC)", url: "https://api.linkedin.com/v2/userinfo" },
  { name: "Me (Profile)", url: "https://api.linkedin.com/v2/me" },
];

async function apiCall(url, label, extraHeaders = {}) {
  console.log(`\n--- ${label} ---`);
  console.log(`  GET ${url}`);
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": "202312",
        ...extraHeaders,
      },
    });
    const status = res.status;
    const contentType = res.headers.get("content-type") || "";
    let body;
    if (contentType.includes("json")) {
      body = await res.json();
    } else {
      body = await res.text();
    }

    const icon = status === 200 ? "✓" : "✗";
    console.log(`  ${icon} Status: ${status}`);

    if (status === 200) {
      const json = JSON.stringify(body, null, 2);
      const preview = json.slice(0, 800);
      console.log(`  Response:\n${preview}${json.length > 800 ? "\n  ... (truncated, full length: " + json.length + " chars)" : ""}`);
    } else {
      console.log(`  Error: ${JSON.stringify(body, null, 2).slice(0, 400)}`);
    }

    return { status, body, label };
  } catch (err) {
    console.log(`  ✗ Network error: ${err.message}`);
    return { status: 0, body: null, label, error: err.message };
  }
}

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║  LinkedIn DMA Portability — Direct Test  ║");
  console.log("╚══════════════════════════════════════════╝\n");

  // Test standard endpoints first
  console.log("=== STANDARD ENDPOINTS ===");
  const standardResults = [];
  for (const ep of STANDARD_ENDPOINTS) {
    standardResults.push(await apiCall(ep.url, ep.name));
  }

  // Test DMA domains
  console.log("\n\n=== DMA PORTABILITY DOMAINS ===");
  const dmaResults = [];
  for (const domain of DMA_DOMAINS) {
    const url = `https://api.linkedin.com/rest/memberSnapshotData?q=criteria&domain=${domain}`;
    dmaResults.push(await apiCall(url, `DMA: ${domain}`));
  }

  // Summary
  console.log("\n\n========================================");
  console.log("SUMMARY");
  console.log("========================================\n");

  const allResults = [...standardResults, ...dmaResults];
  const working = allResults.filter((r) => r.status === 200);
  const failed = allResults.filter((r) => r.status !== 200);

  console.log(`✓ Working (${working.length}):`);
  working.forEach((r) => console.log(`    ${r.label}`));

  console.log(`\n✗ Failed (${failed.length}):`);
  failed.forEach((r) => console.log(`    ${r.label} → ${r.status}`));

  // Key verdict
  console.log("\n========================================");
  console.log("VERDICT");
  console.log("========================================\n");

  const posts = dmaResults.find((r) => r.label === "DMA: MEMBER_SHARE_INFO");
  const profile = dmaResults.find((r) => r.label === "DMA: PROFILE");
  const positions = dmaResults.find((r) => r.label === "DMA: POSITIONS");
  const skills = dmaResults.find((r) => r.label === "DMA: SKILLS");

  if (posts?.status === 200) console.log("🎉 POSTS: Available via DMA API!");
  else console.log(`✗ POSTS: Not available (${posts?.status})`);

  if (profile?.status === 200) console.log("🎉 PROFILE: Available via DMA API!");
  else console.log(`✗ PROFILE: Not available (${profile?.status})`);

  if (positions?.status === 200) console.log("🎉 POSITIONS: Available via DMA API!");
  else console.log(`✗ POSITIONS: Not available (${positions?.status})`);

  if (skills?.status === 200) console.log("🎉 SKILLS: Available via DMA API!");
  else console.log(`✗ SKILLS: Not available (${skills?.status})`);
}

main().catch(console.error);
