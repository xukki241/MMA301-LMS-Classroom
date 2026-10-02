import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Builder, Browser, By, until } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";

const authUrl = (process.env.AUTH_URL || "http://127.0.0.1:4001").replace(/\/$/, "");
const coreUrl = (process.env.CORE_URL || "http://127.0.0.1:4002").replace(/\/$/, "");
const evidenceDir = path.resolve("test-results", "selenium");
const reportDir = path.resolve("test-reports", "selenium");
const results = [];

await mkdir(evidenceDir, { recursive: true });
await mkdir(reportDir, { recursive: true });

const options = new chrome.Options()
  .addArguments("--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--window-size=1440,1000");

const driver = await new Builder().forBrowser(Browser.CHROME).setChromeOptions(options).build();

async function checkDocs(name, baseUrl, textPattern) {
  const startedAt = Date.now();
  try {
    await driver.get(`${baseUrl}/docs`);
    await driver.wait(until.elementLocated(By.css("body")), 15_000);
    await driver.wait(async () => textPattern.test(await driver.findElement(By.css("body")).getText()), 15_000);
    const body = await driver.findElement(By.css("body")).getText();
    assert.match(body, textPattern);
    const png = await driver.takeScreenshot();
    const screenshot = path.join(evidenceDir, `${name}-docs.png`);
    await writeFile(screenshot, png, "base64");
    results.push({ name, status: "pass", url: `${baseUrl}/docs`, durationMs: Date.now() - startedAt, screenshot });
  } catch (error) {
    const screenshot = path.join(evidenceDir, `${name}-docs-failed.png`);
    try { await writeFile(screenshot, await driver.takeScreenshot(), "base64"); } catch {}
    results.push({ name, status: "fail", url: `${baseUrl}/docs`, durationMs: Date.now() - startedAt, error: error.message, screenshot });
    throw error;
  }
}

let failure;
try {
  await checkDocs("auth", authUrl, /Auth|Authentication|API|Scalar/i);
  await checkDocs("core", coreUrl, /LMS|Class|API|Scalar/i);

  const [authHealth, coreHealth, coreSpec] = await Promise.all([
    fetch(`${authUrl}/health`),
    fetch(`${coreUrl}/health`),
    fetch(`${coreUrl}/openapi.json`),
  ]);
  assert.equal(authHealth.status, 200);
  assert.equal(coreHealth.status, 200);
  assert.equal(coreSpec.status, 200);
  const spec = await coreSpec.json();
  assert.ok(spec.paths?.["/classes"]);
  assert.ok(spec.paths?.["/classes/{classId}/exercises"]);
  results.push({ name: "health-and-openapi", status: "pass", durationMs: 0 });
} catch (error) {
  failure = error;
} finally {
  await driver.quit();
  await writeFile(path.join(reportDir, "results.json"), JSON.stringify({ authUrl, coreUrl, results }, null, 2));
}

console.log(JSON.stringify({ authUrl, coreUrl, results }, null, 2));
if (failure) throw failure;
