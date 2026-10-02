const authUrl = (process.env.AUTH_URL || "http://127.0.0.1:4001").replace(/\/$/, "");
const coreUrl = (process.env.CORE_URL || "http://127.0.0.1:4002").replace(/\/$/, "");
const teacherEmail = process.env.SMOKE_TEACHER_EMAIL || "teacher@lms.local";
const teacherPassword = process.env.SMOKE_TEACHER_PASSWORD || "Demo123!";
const studentEmail = process.env.SMOKE_STUDENT_EMAIL || "student@lms.local";
const studentPassword = process.env.SMOKE_STUDENT_PASSWORD || "Demo123!";
const expectDevTokens = process.env.EXPECT_DEV_TOKENS === "1";

async function get(url, expected) {
  const response = await fetch(url);
  if (response.status !== expected) throw new Error(`${url}: expected ${expected}, got ${response.status}`);
  return response;
}

async function login(email, password) {
  const response = await fetch(`${authUrl}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (response.status !== 200) throw new Error(`login ${email}: expected 200, got ${response.status}`);
  const body = await response.json();
  if (typeof body.token !== "string" || body.token.length < 20) throw new Error(`login ${email}: token missing`);
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
await get(`${coreUrl}/docs/tokens/teacher`, expectDevTokens ? 200 : 403);
await get(`${coreUrl}/docs/tokens/student`, expectDevTokens ? 200 : 403);
await login(teacherEmail, teacherPassword);
await login(studentEmail, studentPassword);

console.log(JSON.stringify({
  authUrl,
  coreUrl,
  authPaths: Object.keys(authSpec.paths).length,
  corePaths: Object.keys(coreSpec.paths).length,
  checks: ["health", "openapi", "scalar", "production-dev-token-lock", "teacher-login", "student-login"],
  status: "pass",
}, null, 2));
