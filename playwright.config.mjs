import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./qa/scalar",
  timeout: 30_000,
  fullyParallel: true,
  reporter: process.env.CI ? [["html", { outputFolder: "test-reports/scalar" }], ["junit", { outputFile: "test-reports/scalar.xml" }]] : "list",
  use: { baseURL: process.env.CORE_URL || "http://127.0.0.1:4002", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
