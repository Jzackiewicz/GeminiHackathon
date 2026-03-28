/**
 * Convert HTML string to PDF via Puppeteer + system Chromium.
 *
 * Usage: node html_to_pdf.mjs <output_path>
 * Reads HTML from stdin.
 */
import puppeteer from "puppeteer-core";
import { readFileSync } from "fs";

const outputPath = process.argv[2];
if (!outputPath) {
  console.error(JSON.stringify({ error: "Usage: node html_to_pdf.mjs <output_path>" }));
  process.exit(1);
}

const html = readFileSync("/dev/stdin", "utf-8");

try {
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });
  await page.pdf({
    path: outputPath,
    format: "A4",
    printBackground: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });
  await browser.close();
  console.log(JSON.stringify({ path: outputPath }));
} catch (err) {
  console.error(JSON.stringify({ error: err.message || String(err) }));
  process.exit(1);
}
