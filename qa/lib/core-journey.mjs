import assert from "node:assert/strict";

export function journeyEnabled() {
  if (process.env.SMOKE_JOURNEY === "0") return false;
  if (process.env.SMOKE_JOURNEY === "1") return true;
  return process.env.SMOKE_REGISTER_TEMP === "1";
}

export function dueOffsetMs() {
  const sec = Number(process.env.SMOKE_DUE_OFFSET_SEC ?? "90");
  assert.ok(Number.isFinite(sec) && sec >= 30 && sec <= 300, "SMOKE_DUE_OFFSET_SEC must be 30–300");
  return sec * 1000;
}

function authHeaders(token) {
  return {
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
  };
}

async function expectStatus(label, response, expected) {
  if (response.status === expected) return;
  const snippet = (await response.text()).slice(0, 200);
  throw new Error(`${label}: expected ${expected}, got ${response.status} — ${snippet}`);
}

export async function apiJson(method, url, { token, body, expected }) {
  const response = await fetch(url, {
    method,
    headers: token ? authHeaders(token) : { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  await expectStatus(`${method} ${url}`, response, expected);
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Auth+Core business journey: class → join → post → exercise → submission → grade → student read-back.
 * Does not log tokens or credentials.
 */
export async function runCoreBusinessJourney({ coreUrl, teacherToken, studentToken, label }) {
  const base = coreUrl.replace(/\/$/, "");
  const checks = [];

  const createdClass = await apiJson("POST", `${base}/classes`, {
    token: teacherToken,
    body: { name: `QA ${label}` },
    expected: 201,
  });
  const classId = createdClass.class._id;
  const classCode = createdClass.class.code;
  assert.match(classId, /^[a-f0-9]{24}$/);
  assert.match(classCode, /^[A-Z0-9]{6}$/);
  checks.push("class-create");

  await apiJson("POST", `${base}/classes/join`, {
    token: studentToken,
    body: { code: classCode },
    expected: 200,
  });
  checks.push("class-join");

  await apiJson("POST", `${base}/classes/${classId}/posts`, {
    token: teacherToken,
    body: { content: "QA automated smoke post" },
    expected: 201,
  });
  checks.push("post-create");

  const feed = await apiJson("GET", `${base}/classes/${classId}/posts`, {
    token: studentToken,
    expected: 200,
  });
  assert.ok(Array.isArray(feed.posts) && feed.posts.length > 0);
  checks.push("post-feed");

  const dueAt = new Date(Date.now() + dueOffsetMs()).toISOString();
  const exercise = await apiJson("POST", `${base}/classes/${classId}/exercises`, {
    token: teacherToken,
    body: {
      title: "QA smoke exercise",
      description: "Automated staging journey",
      dueAt,
    },
    expected: 201,
  });
  const exerciseId = exercise.exercise._id;
  assert.match(exerciseId, /^[a-f0-9]{24}$/);
  checks.push("exercise-create");

  const submissionPath = `${base}/classes/${classId}/exercises/${exerciseId}/submissions`;
  const submission = await apiJson("POST", submissionPath, {
    token: studentToken,
    body: { content: "QA answer", url: "" },
    expected: 201,
  });
  const submissionId = submission.submission._id;
  assert.match(submissionId, /^[a-f0-9]{24}$/);
  checks.push("submission-create");

  const waitMs = Math.max(0, new Date(dueAt).getTime() - Date.now() + 2000);
  if (waitMs > 0) await sleep(waitMs);
  checks.push("exercise-due-wait");

  const graded = await apiJson("PUT", `${submissionPath}/${submissionId}/grade`, {
    token: teacherToken,
    body: { score: 8.5, feedback: "Good" },
    expected: 200,
  });
  assert.equal(graded.grade.score, 8.5);
  checks.push("submission-grade");

  const mine = await apiJson("GET", `${submissionPath}/mine`, {
    token: studentToken,
    expected: 200,
  });
  assert.equal(mine.grade?.score, 8.5);
  checks.push("submission-mine-grade");

  return { checks, classIdRedacted: "[redacted]", exerciseIdRedacted: "[redacted]" };
}
