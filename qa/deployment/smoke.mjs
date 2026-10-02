import { randomBytes } from "node:crypto";

const authUrl = (process.env.AUTH_URL || "http://127.0.0.1:4001").replace(/\/$/, "");
const coreUrl = (process.env.CORE_URL || "http://127.0.0.1:4002").replace(/\/$/, "");
const registerTemporaryUsers = process.env.SMOKE_REGISTER_TEMP === "1";
const suffix = `${Date.now()}-${randomBytes(3).toString("hex")}`;
const generatedPassword = `Qa-${randomBytes(18).toString("base64url")}!`;
const teacherEmail = registerTemporaryUsers ? `qa.teacher.${suffix}@example.test` : (process.env.SMOKE_TEACHER_EMAIL || "teacher@lms.local");
const teacherPassword = registerTemporaryUsers ? generatedPassword : (process.env.SMOKE_TEACHER_PASSWORD || "Demo123!");
const studentEmail = registerTemporaryUsers ? `qa.student.${suffix}@example.test` : (process.env.SMOKE_STUDENT_EMAIL || "student@lms.local");
const studentPassword = registerTemporaryUsers ? generatedPassword : (process.env.SMOKE_STUDENT_PASSWORD || "Demo123!");
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
if (registerTemporaryUsers) {
  await register("teacher", teacherEmail, teacherPassword, "teacher");
  await register("student", studentEmail, studentPassword, "student");
}
await login("teacher", teacherEmail, teacherPassword);
await login("student", studentEmail, studentPassword);

console.log(JSON.stringify({
  authUrl,
  coreUrl,
  authPaths: Object.keys(authSpec.paths).length,
  corePaths: Object.keys(coreSpec.paths).length,
  accounts: registerTemporaryUsers ? "temporary QA accounts registered; identifiers redacted" : "pre-provisioned QA accounts",
  checks: ["health", "openapi", "scalar", "production-dev-token-lock", "teacher-login", "student-login"],
  status: "pass",
}, null, 2));
