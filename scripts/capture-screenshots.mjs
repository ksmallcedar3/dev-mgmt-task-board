import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../docs/screenshots");
const baseUrl = process.env.BASE_URL ?? "http://localhost:3001";

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(baseUrl, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

await page.screenshot({
  path: path.join(outDir, "main-goal-view.png"),
  fullPage: false,
});

await page.getByRole("button", { name: "課員ビュー" }).click();
await page.waitForTimeout(800);

await page.screenshot({
  path: path.join(outDir, "main-member-view.png"),
  fullPage: false,
});

await browser.close();
console.log("Saved screenshots to", outDir);
