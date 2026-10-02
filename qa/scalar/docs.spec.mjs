import { test, expect } from "@playwright/test";

test("Core Scalar docs render without a browser error", async ({ page, baseURL }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto(`${baseURL}/docs`, { waitUntil: "domcontentloaded" });
  expect(response?.ok()).toBeTruthy();
  await expect(page.locator("body")).toContainText(/LMS|API|Scalar/i);
  expect(errors).toEqual([]);
});

test("Core OpenAPI endpoint is JSON and exposes documented paths", async ({ request, baseURL }) => {
  const response = await request.get(`${baseURL}/openapi.json`);
  expect(response.ok()).toBeTruthy();
  const spec = await response.json();
  expect(spec.openapi).toMatch(/^3\./);
  expect(Object.keys(spec.paths)).toContain("/classes");
  expect(Object.keys(spec.paths)).toContain("/classes/{classId}/exercises");
});

test("Auth Scalar docs render without a browser error", async ({ browser }) => {
  const authURL = process.env.AUTH_URL || "http://127.0.0.1:4001";
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto(`${authURL}/docs`, { waitUntil: "domcontentloaded" });
  expect(response?.ok()).toBeTruthy();
  await expect(page.locator("body")).toContainText(/Auth|Authentication|API|Scalar/i);
  expect(errors).toEqual([]);
  await context.close();
});
