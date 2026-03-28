/**
 * LinkedIn DMA Member Data Portability Test
 *
 * Tests the EU DMA self-serve API path to fetch your own posts and profile data.
 * Scope: r_dma_portability_self_serve
 *
 * SETUP:
 * 1. Go to https://developer.linkedin.com/
 * 2. Create app → use "Member Data Portability (Member) Default Company" (no own company page needed)
 *    OR create a new app with any LinkedIn Company Page you admin
 * 3. In the app's Products tab, request "Member Data Portability (Member)"
 * 4. Copy Client ID and Client Secret
 * 5. Add redirect URI: http://localhost:3000/callback
 * 6. Create .env file in project root:
 *    LINKEDIN_CLIENT_ID=your_client_id
 *    LINKEDIN_CLIENT_SECRET=your_client_secret
 * 7. Run: node tests/linkedin-dma-test.mjs
 */

import http from "node:http";
import { URL } from "node:url";
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
      // Strip surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key.trim()] = val;
    }
  }
} catch {
  console.error("No .env file found. Create one with LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET");
  process.exit(1);
}

const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3000/callback";
const PORT = 3000;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing LINKEDIN_CLIENT_ID or LINKEDIN_CLIENT_SECRET in .env");
  process.exit(1);
}

// ============================================================
// DMA Portability Domains to test
// ============================================================
const DMA_DOMAINS = [
  "MEMBER_SHARE_INFO",   // Posts (the main one we want!)
  "ARTICLES",            // Longform articles
  "PROFILE",             // Basic profile info
  "POSITIONS",           // Job history
  "EDUCATION",           // Education
  "SKILLS",              // Skills
  "CERTIFICATIONS",      // Certifications
  "ALL_COMMENTS",        // Comments on posts
  "ALL_LIKES",           // Reactions/likes
  "INSTANT_REPOSTS",     // Reposts
  "RICH_MEDIA",          // Photos/videos/documents
];

// Also test standard self-serve endpoints for comparison
const STANDARD_ENDPOINTS = [
  { name: "UserInfo (OIDC)", url: "https://api.linkedin.com/v2/userinfo" },
  { name: "Me (Profile)", url: "https://api.linkedin.com/v2/me" },
  { name: "Me (with projections)", url: "https://api.linkedin.com/v2/me?projection=(id,firstName,lastName,localizedFirstName,localizedLastName,vanityName,localizedHeadline,profilePicture)" },
];

// UGC Post read test (expected to fail without r_member_social)
const POST_READ_ENDPOINTS = [
  { name: "UGC Posts (Legacy)", urlFn: (personId) => `https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(urn:li:person:${personId})&sortBy=LAST_MODIFIED&count=5` },
  { name: "Posts API (New)", urlFn: (personId) => `https://api.linkedin.com/rest/posts?author=urn%3Ali%3Aperson%3A${personId}&q=author&count=5&sortBy=LAST_MODIFIED` },
];

let accessToken = null;
let personId = null;

// ============================================================
// HTTP Server for OAuth callback
// ============================================================
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/callback") {
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error) {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end(`<h1>OAuth Error</h1><pre>${error}: ${url.searchParams.get("error_description")}</pre>`);
      return;
    }

    if (!code) {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end("<h1>No code received</h1>");
      return;
    }

    console.log("\n✓ Authorization code received. Exchanging for token...\n");

    // Exchange code for token
    try {
      const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
        }),
      });

      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        console.error("Token exchange failed:", tokenData);
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(`<h1>Token Error</h1><pre>${JSON.stringify(tokenData, null, 2)}</pre>`);
        return;
      }

      accessToken = tokenData.access_token;
      console.log("✓ Access token received");
      console.log(`  Scope: ${tokenData.scope}`);
      console.log(`  Expires in: ${tokenData.expires_in}s`);
      console.log(`  Refresh token: ${tokenData.refresh_token ? "YES" : "NO"}`);

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<h1>✓ Token received! Check terminal for test results.</h1><p>You can close this tab.</p>");

      // Run all tests
      await runAllTests();
    } catch (err) {
      console.error("Token exchange error:", err);
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end(`<h1>Error</h1><pre>${err.message}</pre>`);
    }
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

// ============================================================
// API call helper
// ============================================================
async function linkedinGet(url, label, extraHeaders = {}) {
  console.log(`\n--- ${label} ---`);
  console.log(`  GET ${url}`);
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": "202503",
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

    const statusEmoji = status === 200 ? "✓" : "✗";
    console.log(`  ${statusEmoji} Status: ${status}`);

    if (status === 200) {
      const preview = JSON.stringify(body, null, 2).slice(0, 500);
      console.log(`  Response (preview):\n${preview}${preview.length >= 500 ? "\n  ... (truncated)" : ""}`);
    } else {
      console.log(`  Error: ${JSON.stringify(body, null, 2).slice(0, 300)}`);
    }

    return { status, body, label };
  } catch (err) {
    console.log(`  ✗ Network error: ${err.message}`);
    return { status: 0, body: null, label, error: err.message };
  }
}

// ============================================================
// Test Suites
// ============================================================

async function testStandardEndpoints() {
  console.log("\n\n========================================");
  console.log("TEST 1: Standard Self-Serve Endpoints");
  console.log("========================================");

  const results = [];
  for (const ep of STANDARD_ENDPOINTS) {
    const result = await linkedinGet(ep.url, ep.name);
    results.push(result);

    // Extract person ID from /v2/me response
    if (ep.name === "Me (Profile)" && result.status === 200 && result.body?.id) {
      personId = result.body.id;
      console.log(`  → Person ID extracted: ${personId}`);
    }
    // Or from userinfo sub
    if (ep.name === "UserInfo (OIDC)" && result.status === 200 && result.body?.sub) {
      if (!personId) personId = result.body.sub;
      console.log(`  → Sub (user ID): ${result.body.sub}`);
    }
  }
  return results;
}

async function testPostRead() {
  console.log("\n\n========================================");
  console.log("TEST 2: Post READ (expected to need r_member_social)");
  console.log("========================================");

  if (!personId) {
    console.log("  ⚠ No person ID available — skipping post read tests");
    return [];
  }

  const results = [];
  for (const ep of POST_READ_ENDPOINTS) {
    const result = await linkedinGet(ep.urlFn(personId), ep.name);
    results.push(result);
  }
  return results;
}

async function testDMAPortability() {
  console.log("\n\n========================================");
  console.log("TEST 3: DMA Member Data Portability");
  console.log("(This is the key test — posts via EU DMA rights)");
  console.log("========================================");

  const results = [];

  for (const domain of DMA_DOMAINS) {
    const url = `https://api.linkedin.com/rest/memberSnapshotData?q=criteria&domain=${domain}`;
    const result = await linkedinGet(url, `DMA: ${domain}`, {
      "LinkedIn-Version": "202312",
    });
    results.push(result);
  }

  return results;
}

async function testWritePost() {
  console.log("\n\n========================================");
  console.log("TEST 4: Write Post (w_member_social) — SKIP");
  console.log("========================================");
  console.log("  Skipping write test to avoid posting to your LinkedIn.");
  console.log("  w_member_social is self-serve and known to work.");
}

async function runAllTests() {
  console.log("\n\n╔══════════════════════════════════════════╗");
  console.log("║  LinkedIn API Comprehensive Test Suite   ║");
  console.log("║  Testing all endpoints + DMA Portability ║");
  console.log("╚══════════════════════════════════════════╝");

  const standardResults = await testStandardEndpoints();
  const postResults = await testPostRead();
  const dmaResults = await testDMAPortability();
  await testWritePost();

  // Summary
  console.log("\n\n========================================");
  console.log("SUMMARY");
  console.log("========================================\n");

  const allResults = [...standardResults, ...postResults, ...dmaResults];
  const working = allResults.filter((r) => r.status === 200);
  const forbidden = allResults.filter((r) => r.status === 403);
  const other = allResults.filter((r) => r.status !== 200 && r.status !== 403);

  console.log(`✓ Working (${working.length}):`);
  working.forEach((r) => console.log(`    ${r.label}`));

  console.log(`\n✗ Forbidden/403 (${forbidden.length}):`);
  forbidden.forEach((r) => console.log(`    ${r.label}`));

  console.log(`\n? Other (${other.length}):`);
  other.forEach((r) => console.log(`    ${r.label} → ${r.status || r.error}`));

  console.log("\n========================================");
  console.log("DECISION: Can we read posts?");
  console.log("========================================\n");

  const postsViaApi = postResults.some((r) => r.status === 200);
  const postsViaDma = dmaResults.find((r) => r.label === "DMA: MEMBER_SHARE_INFO");

  if (postsViaApi) {
    console.log("🎉 YES — Posts readable via standard API! (unexpected but great)");
  } else if (postsViaDma?.status === 200) {
    console.log("🎉 YES — Posts readable via DMA Portability API!");
    console.log("   This is the EU DMA path — works for EU/EEA members.");
  } else {
    console.log("✗ NO — Posts not readable via any tested API path.");
    console.log("  Fallback: Use LinkedIn Data Export (Shares.csv) + Vapi voice onboarding.");
  }

  const profileViaDma = dmaResults.find((r) => r.label === "DMA: POSITIONS");
  if (profileViaDma?.status === 200) {
    console.log("🎉 BONUS — Full profile data (positions, education, skills) available via DMA!");
  }

  console.log("\nDone. Press Ctrl+C to exit.\n");
}

// ============================================================
// Start
// ============================================================
server.listen(PORT, () => {
  // Build OAuth URL — request ALL potentially useful scopes
  // LinkedIn will either grant them or fail with unauthorized_scope_error
  // We test multiple scope combinations

  const scopes = [
    "openid",
    "profile",
    "email",
    "w_member_social",
    "r_dma_portability_self_serve",
  ];

  const authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("state", Math.random().toString(36).slice(2));
  authUrl.searchParams.set("scope", scopes.join(" "));

  console.log("╔══════════════════════════════════════════╗");
  console.log("║  LinkedIn API Test — DMA + Standard      ║");
  console.log("╚══════════════════════════════════════════╝\n");
  console.log(`Server running on http://localhost:${PORT}\n`);
  console.log("Requesting scopes:", scopes.join(", "));
  console.log("\n→ Open this URL in your browser:\n");
  console.log(authUrl.toString());
  console.log("\nWaiting for OAuth callback...\n");
});
