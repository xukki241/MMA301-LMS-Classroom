import { redactedAccountSummary, resolveStagingAccounts } from "../lib/staging-credentials.mjs";
import { journeyEnabled, runCoreBusinessJourney } from "../lib/core-journey.mjs";

const authUrl = (process.env.AUTH_URL || "http://127.0.0.1:4001").replace(/\/$/, "");
const coreUrl = (process.env.CORE_URL || "http://127.0.0.1:4002").replace(/\/$/, "");
const accounts = resolveStagingAccounts();
const expectDevTokens = process.env.EXPECT_DEV_TOKENS === "1";

async function get(url, expected, method = "GET") {
  const response = await fetch(url, { method });
  if (response.status !== expected) throw new Error(`${url}: expected ${expected}, got ${response.status}`);
  return response;
}

async function register(label, email, password, role) {
  const response = await fetch(`${authUrl}/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, displayName: `QA ${label}`, password, role }),
  });
  if (response.status !== 201) throw new Error(`register ${label}: expected 201, got ${response.status}`);
}

async function login(label, email, password) {
  const response = await fetch(`${authUrl}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (response.status !== 200) throw new Error(`login ${label}: expected 200, got ${response.status}`);
  const body = await response.json();
  if (typeof body.token !== "string" || body.token.length < 20) throw new Error(`login ${label}: token missing`);
  return body.token;
}

const checks = ["health", "openapi", "scalar", "production-dev-token-lock", "teacher-login", "student-login"];

await get(`${authUrl}/health`, 200);
await get(`${coreUrl}/health`, 200);
const authSpec = await (await get(`${authUrl}/openapi.json`, 200)).json();
const coreSpec = await (await get(`${coreUrl}/openapi.json`, 200)).json();
if (!authSpec.paths?.["/auth/login"] || !authSpec.paths?.["/auth/register"]) throw new Error("Auth OpenAPI is incomplete");
if (Object.keys(coreSpec.paths || {}).length < 20) throw new Error("Core OpenAPI is unexpectedly incomplete");
await get(`${authUrl}/docs`, 200);
await get(`${coreUrl}/docs`, 200);
await get(`${coreUrl}/docs/tokens/teacher`, expectDevTokens ? 200 : 403, "POST");
await get(`${coreUrl}/docs/tokens/student`, expectDevTokens ? 200 : 403, "POST");
if (accounts.registerTemporaryUsers) {
  await register("teacher", accounts.teacherEmail, accounts.teacherPassword, "teacher");
  await register("student", accounts.studentEmail, accounts.studentPassword, "student");
}
const teacherToken = await login("teacher", accounts.teacherEmail, accounts.teacherPassword);
const studentToken = await login("student", accounts.studentEmail, accounts.studentPassword);

let journey;
if (journeyEnabled()) {
  journey = await runCoreBusinessJourney({
    coreUrl,
    teacherToken,
    studentToken,
    label: `Smoke ${accounts.suffix}`,
  });
  checks.push(...journey.checks);
}

console.log(JSON.stringify({
  authUrl,
  coreUrl,
  authPaths: Object.keys(authSpec.paths).length,
  corePaths: Object.keys(coreSpec.paths).length,
  accounts: redactedAccountSummary(accounts),
  journey: journeyEnabled() ? "full-core-business" : "skipped (set SMOKE_JOURNEY=1 or SMOKE_REGISTER_TEMP=1)",
  checks,
  status: "pass",
}, null, 2));
