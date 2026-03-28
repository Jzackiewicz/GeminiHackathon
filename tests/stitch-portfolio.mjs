import "dotenv/config";
import { stitch } from "@google/stitch-sdk";
import { writeFileSync } from "fs";

/**
 * WORKAROUND: project.generate() is broken in SDK v0.0.3.
 * It expects outputComponents[0].design.screens but screens are at [1].
 * We use callTool directly and parse the response ourselves.
 */
async function generatePortfolio(prompt, projectTitle, deviceType = "DESKTOP") {
  const project = await stitch.callTool("create_project", { title: projectTitle });
  const projectId = project.name.replace("projects/", "");

  const start = Date.now();
  const raw = await stitch.callTool("generate_screen_from_text", {
    projectId,
    prompt,
    deviceType,
    modelId: "GEMINI_3_FLASH",
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  // Find the design component with screens (usually index 1, but search to be safe)
  let screen = null;
  for (const comp of raw.outputComponents || []) {
    if (comp.design?.screens?.length > 0) {
      screen = comp.design.screens[0];
      break;
    }
  }

  if (!screen) {
    throw new Error("No screen found in response");
  }

  // Download HTML
  let html = null;
  if (screen.htmlCode?.downloadUrl) {
    const resp = await fetch(screen.htmlCode.downloadUrl);
    html = await resp.text();
  }

  // Get screenshot URL
  const screenshotUrl = screen.screenshot?.downloadUrl || null;

  return { html, screenshotUrl, elapsed, screen };
}

function buildPrompt(userData, jobData) {
  return (
    `A professional single-page portfolio website for ${userData.name}, ${userData.title}. ` +
    `Skills: ${userData.skills.join(", ")}. ` +
    `Projects: ${userData.projects.map((p) => `${p.name} (${p.tech})`).join("; ")}. ` +
    `Tailored for a ${jobData.role} position at ${jobData.company}. ` +
    `Emphasize these skills: ${jobData.requiredSkills.join(", ")}. ` +
    `Style: modern, dark theme, single page, responsive.`
  );
}

// --- Test Profile 1: Frontend Developer ---
const profile1 = {
  user: {
    name: "Anna Kowalska",
    title: "Frontend Developer",
    skills: ["React", "TypeScript", "Next.js", "Tailwind CSS", "Figma"],
    projects: [
      { name: "E-commerce Dashboard", tech: "React, Redux, Chart.js" },
      { name: "Design System Library", tech: "Storybook, TypeScript" },
      { name: "Real-time Chat App", tech: "Next.js, WebSocket" },
    ],
  },
  job: {
    role: "Senior Frontend Engineer",
    company: "Spotify",
    requiredSkills: ["React", "TypeScript", "Design Systems", "Performance"],
  },
};

// --- Test Profile 2: Backend/ML Engineer ---
const profile2 = {
  user: {
    name: "Marek Nowak",
    title: "ML Engineer",
    skills: ["Python", "PyTorch", "FastAPI", "Docker", "GCP"],
    projects: [
      { name: "Fraud Detection Pipeline", tech: "PyTorch, Airflow, BigQuery" },
      { name: "NLP Summarizer API", tech: "FastAPI, HuggingFace, Redis" },
      { name: "Recommendation Engine", tech: "TensorFlow, Kubernetes" },
    ],
  },
  job: {
    role: "Machine Learning Engineer",
    company: "DeepMind",
    requiredSkills: ["PyTorch", "Distributed Training", "Python", "Research"],
  },
};

async function runTest(profile, label) {
  console.log(`\n=== Generating: ${label} ===`);
  const prompt = buildPrompt(profile.user, profile.job);
  console.log(`Prompt (first 120 chars): ${prompt.substring(0, 120)}...`);

  const result = await generatePortfolio(prompt, `Portfolio - ${profile.user.name}`);

  if (result.html) {
    const filename = `tests/output/portfolio-${label}.html`;
    writeFileSync(filename, result.html);
    console.log(`PASS: ${result.elapsed}s | ${result.html.length} chars | saved to ${filename}`);

    // Content checks
    const nameFound = result.html.includes(profile.user.name);
    const skillsFound = profile.job.requiredSkills.filter((s) =>
      result.html.toLowerCase().includes(s.toLowerCase())
    );
    const projectsFound = profile.user.projects.filter((p) =>
      result.html.toLowerCase().includes(p.name.toLowerCase())
    );

    console.log(`  Name in output: ${nameFound ? "YES" : "NO"}`);
    console.log(`  Job skills found: ${skillsFound.length}/${profile.job.requiredSkills.length} (${skillsFound.join(", ")})`);
    console.log(`  Projects found: ${projectsFound.length}/${profile.user.projects.length} (${projectsFound.map((p) => p.name).join(", ")})`);

    return { label, pass: true, elapsed: result.elapsed, html: result.html };
  } else {
    console.error(`FAIL: No HTML returned (${result.elapsed}s)`);
    return { label, pass: false, elapsed: result.elapsed };
  }
}

try {
  const r1 = await runTest(profile1, "frontend-anna");
  const r2 = await runTest(profile2, "ml-marek");

  // Comparison: are they actually different?
  console.log("\n=== Comparison ===");
  if (r1.pass && r2.pass) {
    const similarity = r1.html === r2.html ? "IDENTICAL (BAD)" : "DIFFERENT (GOOD)";
    console.log(`Outputs: ${similarity}`);
    console.log(`Size: Anna=${r1.html.length} chars, Marek=${r2.html.length} chars`);
  }

  console.log("\n=== Summary ===");
  console.log(`Profile 1 (Anna): ${r1.pass ? "PASS" : "FAIL"} in ${r1.elapsed}s`);
  console.log(`Profile 2 (Marek): ${r2.pass ? "PASS" : "FAIL"} in ${r2.elapsed}s`);
  console.log("\nOpen tests/output/portfolio-*.html in browser to visually inspect.");
} catch (err) {
  console.error("FATAL:", err.message);
  console.error(err);
  process.exit(1);
}
