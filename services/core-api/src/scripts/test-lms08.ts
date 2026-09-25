import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

// Integration test: uses real Auth, Core and Mongo. Run only against disposable local/test data.
const authUrl = process.env.AUTH_URL ?? "http://127.0.0.1:4001";
const coreUrl = process.env.CORE_URL ?? "http://127.0.0.1:4002";
for (const url of [authUrl, coreUrl]) {
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname),
    "LMS-08 fixture creation is restricted to local test services");
}

type Auth = { token: string; user: { id: string; role: string } };
type Classroom = { _id: string; code: string };
type Exercise = {
  _id: string; classId: string; title: string; description: string;
  dueAt: string; createdBy: string; createdAt: string; updatedAt: string;
};
type ApiError = { error: string; code: string };

async function request<T>(base: string, path: string, status: number, token?: string, body?: unknown) {
  const response = await fetch(`${base}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal(response.status, status, `${body === undefined ? "GET" : "POST"} ${path}`);
  return await response.json() as T;
}

async function run() {
  const runId = randomUUID();
  await request(coreUrl, "/health", 200);
  await request(authUrl, "/health", 200);
  async function account(role: "teacher" | "student", name: string) {
    const email = `lms08-${name}-${runId}@example.test`;
    const password = `Test-${randomUUID()}!`;
    await request(authUrl, "/auth/register", 201, undefined, { email, password, role, displayName: `LMS08 ${name}` });
    return request<Auth>(authUrl, "/auth/login", 200, undefined, { email, password });
  }
  const teacher = await account("teacher", "owner");
  const otherTeacher = await account("teacher", "other-teacher");
  const student = await account("student", "member");
  const outsider = await account("student", "outsider");
  const { class: cls } = await request<{ class: Classroom }>(coreUrl, "/classes", 201, teacher.token, { name: `LMS08 ${runId}` });
  const { class: otherClass } = await request<{ class: Classroom }>(coreUrl, "/classes", 201, otherTeacher.token, { name: `LMS08 other ${runId}` });
  await request(coreUrl, "/classes/join", 200, student.token, { code: cls.code });
  console.log("PASS prerequisites: real Auth login, classroom creation and student membership");
  const path = `/classes/${cls._id}/exercises`;
  const otherPath = `/classes/${otherClass._id}/exercises`;
  const dueAt = new Date(Date.now() + 86_400_000).toISOString();
  const payload = { title: "  Bài tập 1  ", description: "Nội dung bài tập", dueAt };
  let passed = 0;
  let failed = 0;
  async function check(name: string, action: () => Promise<void>) {
    try {
      await action();
      passed++;
      console.log(`PASS ${name}`);
    } catch (error) {
      failed++;
      console.error(`FAIL ${name}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }
  async function reject(name: string, status: number, token: string | undefined, body: unknown, route = path) {
    await check(name, async () => {
      const result = await request<ApiError>(coreUrl, route, status, token, body);
      assert.equal(typeof result.error, "string");
      assert.equal(typeof result.code, "string");
    });
  }
  const createdIds: string[] = [];
  await check("owner creates and server assigns classId/createdBy", async () => {
    const { exercise } = await request<{ exercise: Exercise }>(coreUrl, path, 201, teacher.token, payload);
    assert.equal(exercise.title, "Bài tập 1");
    assert.equal(exercise.description, payload.description);
    assert.equal(exercise.classId, cls._id);
    assert.equal(exercise.createdBy, teacher.user.id);
    assert.equal(exercise.dueAt, dueAt);
    assert.match(exercise._id, /^[a-f0-9]{24}$/);
    assert.ok(Number.isFinite(Date.parse(exercise.createdAt)));
    assert.ok(Number.isFinite(Date.parse(exercise.updatedAt)));
    createdIds.push(exercise._id);
  });
  await reject("student cannot create", 403, student.token, payload);
  await reject("another teacher cannot create", 403, otherTeacher.token, payload);
  await reject("outsider cannot create", 403, outsider.token, payload);
  await reject("missing JWT", 401, undefined, payload);
  await reject("invalid JWT", 401, "invalid-token", payload);
  await reject("invalid class ID", 400, teacher.token, payload, "/classes/not-an-id/exercises");
  await reject("nonexistent class", 404, teacher.token, payload, "/classes/000000000000000000000000/exercises");
  for (const [label, body] of [
    ["empty title", { ...payload, title: "   " }],
    ["missing title", { dueAt }],
    ["title too long", { ...payload, title: "x".repeat(201) }],
    ["description type", { ...payload, description: 123 }],
    ["description too long", { ...payload, description: "x".repeat(10001) }],
    ["spoofed createdBy", { ...payload, createdBy: otherTeacher.user.id }],
    ["spoofed classId", { ...payload, classId: otherClass._id }],
    ["unknown property", { ...payload, points: 100 }],
    ["array body", []],
  ] as const) await reject(label, 422, teacher.token, body);
  for (const [label, value] of [
    ["past deadline", "2000-01-01T00:00:00.000Z"],
    ["invalid deadline", "not-a-date"],
    ["nonexistent calendar date", "2099-02-30T12:00:00Z"],
    ["missing timezone", "2099-01-01T12:00:00"],
    ["date only", "2099-01-01"],
    ["missing deadline", undefined],
    ["numeric deadline", Date.now() + 86_400_000],
    ["null deadline", null],
  ] as const) await reject(label, 400, teacher.token, { ...payload, dueAt: value });
  await check("description defaults to empty string and timezone normalizes to UTC", async () => {
    const { exercise } = await request<{ exercise: Exercise }>(coreUrl, path, 201, teacher.token,
      { title: "Offset", dueAt: "2099-01-01T07:00:00+07:00" });
    assert.equal(exercise.description, "");
    assert.equal(exercise.dueAt, "2099-01-01T00:00:00.000Z");
    createdIds.push(exercise._id);
  });
  if (!process.argv.includes("--create-only")) {
    await check("empty class returns empty array", async () => {
      const result = await request<{ exercises: Exercise[] }>(coreUrl, otherPath, 200, otherTeacher.token);
      assert.deepEqual(result, { exercises: [] });
    });
    await check("persisted list visible to member; rejected creates leave no records", async () => {
      const { exercises } = await request<{ exercises: Exercise[] }>(coreUrl, path, 200, student.token);
      assert.equal(exercises.length, 2);
      assert.deepEqual(exercises.map(e => e._id), createdIds);
      assert.ok(exercises.every(e => e.classId === cls._id));
      assert.equal(exercises[0].title, "Bài tập 1");
      assert.equal(exercises[0].dueAt, dueAt);
    });
    for (const [label, token, status, route] of [
      ["outsider cannot list", outsider.token, 403, path],
      ["other teacher cannot list", otherTeacher.token, 403, path],
      ["list requires JWT", undefined, 401, path],
      ["list rejects invalid JWT", "invalid-token", 401, path],
      ["list invalid ID", teacher.token, 400, "/classes/bad/exercises"],
      ["list nonexistent class", teacher.token, 404, "/classes/000000000000000000000000/exercises"],
    ] as const) await reject(label, status, token, undefined, route);
    await check("owner reads; list filters class and sorts by dueAt then _id", async () => {
      await request(coreUrl, otherPath, 201, otherTeacher.token, { title: "Other class", dueAt });
      const { exercise: tied } = await request<{ exercise: Exercise }>(coreUrl, path, 201, teacher.token,
        { title: "Same deadline", dueAt });
      const { exercises } = await request<{ exercises: Exercise[] }>(coreUrl, path, 200, teacher.token);
      assert.equal(exercises.length, 3);
      assert.deepEqual(exercises.map(e => e._id), [...[createdIds[0], tied._id].sort(), createdIds[1]]);
      assert.ok(exercises.every(e => e.classId === cls._id));
    });
  }
  console.log(`LMS-08: ${passed} passed, ${failed} failed (${new Date().toISOString()})`);
  if (failed) process.exitCode = 1;
}

run().catch(error => {
  console.error(error instanceof Error ? error.message : "LMS-08 setup failed");
  process.exitCode = 1;
});
