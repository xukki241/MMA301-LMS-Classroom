const coreURL = process.env.CORE_URL ?? "http://127.0.0.1:4002";
const authURL = process.env.AUTH_URL ?? "http://127.0.0.1:4001";
const expectDevTokens = process.env.EXPECT_DEV_TOKENS === "1";

async function assertStatus(url: string, expected: number, init?: RequestInit) {
  const response = await fetch(url, init);
  if (response.status !== expected) throw new Error(`Expected ${expected} for ${url}, got ${response.status}`);
  return response;
}

const coreOpenApi = await assertStatus(`${coreURL}/openapi.json`, 200);
const coreSpec = await coreOpenApi.json() as { paths?: Record<string, unknown> };
if (!coreSpec.paths || Object.keys(coreSpec.paths).length < 20) throw new Error("Core OpenAPI is unexpectedly incomplete");
await assertStatus(`${coreURL}/docs`, 200);

const authOpenApi = await assertStatus(`${authURL}/openapi.json`, 200);
const authSpec = await authOpenApi.json() as { paths?: Record<string, unknown> };
if (!authSpec.paths || !authSpec.paths["/auth/login"] || !authSpec.paths["/auth/register"]) throw new Error("Auth OpenAPI is incomplete");
await assertStatus(`${authURL}/docs`, 200);

for (const role of ["teacher", "student"]) {
  const response = await fetch(`${coreURL}/docs/tokens/${role}`, { method: "POST" });
  const expected = expectDevTokens ? 200 : 403;
  if (response.status !== expected) throw new Error(`Unexpected ${role} docs token status: ${response.status}`);
}

console.log(`Docs runtime checks passed: Core ${Object.keys(coreSpec.paths).length} paths, Auth ${Object.keys(authSpec.paths).length} paths`);
