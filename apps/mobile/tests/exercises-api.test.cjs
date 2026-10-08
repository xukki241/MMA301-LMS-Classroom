const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { afterEach, test } = require("node:test");
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  module._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
};

const api = require("../src/lib/exercises-api.ts");
const { CORE_URL } = require("../src/lib/config.ts");
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });

const classId = "66e6b4f73a1b5c0012a45678";
const exerciseId = "66e6b4f73a1b5c0012a47777";
const submissionId = "66e6b4f73a1b5c0012a48888";
const exercise = {
  _id: exerciseId,
  classId,
  title: "Bài tập 1",
  description: "Mô tả",
  dueAt: "2099-01-01T00:00:00.000Z",
  createdBy: "teacher-id",
  createdAt: "2026-10-03T00:00:00.000Z",
};
const submission = {
  _id: submissionId,
  exerciseId,
  studentId: "student-id",
  content: "Câu trả lời",
  url: "https://example.test/answer",
  submittedAt: "2026-10-03T00:01:00.000Z",
};

function respond(body, status = 200, inspect = () => {}) {
  global.fetch = async (url, options) => {
    inspect(url, options);
    return new Response(JSON.stringify(body), { status });
  };
}

test("exercise validators require title and a future ISO timestamp with timezone", () => {
  assert.equal(api.validateExerciseTitle("  Bài tập 1  "), "Bài tập 1");
  assert.throws(() => api.validateExerciseTitle(" "), /1–200/);
  assert.throws(() => api.validateExerciseTitle("x".repeat(201)), /1–200/);
  assert.equal(api.validateDueAtIso(exercise.dueAt), exercise.dueAt);
  assert.equal(api.validateDueAtIso("2099-01-01T07:00:00+07:00"), "2099-01-01T07:00:00+07:00");
  assert.throws(() => api.validateDueAtIso("2099-01-01T00:00:00"), /ISO/);
  assert.throws(() => api.validateDueAtIso("2020-01-01T00:00:00Z"), /tương lai/);
});

test("list exercises uses the class endpoint and bearer token", async () => {
  respond({ exercises: [exercise] }, 200, (url, options) => {
    assert.equal(url, `${CORE_URL}/classes/${classId}/exercises`);
    assert.equal(options.method, "GET");
    assert.equal(options.headers.Authorization, "Bearer session");
  });
  const result = await api.listExercises("session", classId);
  assert.equal(result[0].id, exerciseId);
  assert.equal(result[0].dueAt, exercise.dueAt);
});

test("list exercises accepts empty data and rejects malformed, cross-class, or duplicate rows", async () => {
  respond({ exercises: [] });
  assert.deepEqual(await api.listExercises("session", classId), []);
  for (const body of [
    {},
    { exercises: null },
    { exercises: [{ ...exercise, classId: "other" }] },
    { exercises: [{ ...exercise, dueAt: "bad" }] },
    { exercises: [exercise, exercise] },
  ]) {
    respond(body);
    await assert.rejects(api.listExercises("session", classId), error => error.code === "INVALID_RESPONSE");
  }
});

test("create exercise trims input and sends only the API contract", async () => {
  respond({ exercise }, 201, (url, options) => {
    assert.equal(url, `${CORE_URL}/classes/${classId}/exercises`);
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), {
      title: "Bài tập 1",
      description: "Mô tả",
      dueAt: exercise.dueAt,
    });
  });
  const result = await api.createExercise("session", classId, {
    title: "  Bài tập 1 ", description: " Mô tả ", dueAt: exercise.dueAt,
  });
  assert.equal(result.id, exerciseId);
});

test("invalid exercise input never sends a request", async () => {
  let calls = 0;
  respond({ exercise }, 201, () => { calls += 1; });
  await assert.rejects(api.createExercise("session", classId, {
    title: " ", dueAt: exercise.dueAt,
  }), error => error.status === 422);
  await assert.rejects(api.createExercise("session", classId, {
    title: "Valid", dueAt: "2099-01-01T00:00:00",
  }), error => error.status === 422);
  assert.equal(calls, 0);
});

test("submission validators require content or an HTTP(S) URL", () => {
  assert.deepEqual(api.validateSubmissionPayload(" answer ", ""), { content: "answer", url: "" });
  assert.deepEqual(api.validateSubmissionPayload("", " https://example.test/a "), {
    content: "", url: "https://example.test/a",
  });
  assert.throws(() => api.validateSubmissionPayload("", ""), /Nhập nội dung/);
  assert.throws(() => api.validateSubmissionPayload("", "javascript:alert(1)"), /http/);
});

test("missing own submission is a real null result; a grade is parsed on success", async () => {
  respond({ error: "No submission found", code: "SUBMISSION_NOT_FOUND" }, 404);
  assert.equal(await api.getMySubmission("session", classId, exerciseId), null);

  respond({ submission, grade: { submissionId, score: 8.5, feedback: "Tốt" } });
  const result = await api.getMySubmission("session", classId, exerciseId);
  assert.equal(result.submission.id, submissionId);
  assert.equal(result.grade.score, 8.5);
});

test("create and update submission use the nested endpoints and trimmed body", async () => {
  respond({ submission }, 201, (url, options) => {
    assert.equal(url, `${CORE_URL}/classes/${classId}/exercises/${exerciseId}/submissions`);
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), { content: "Câu trả lời", url: "" });
  });
  assert.equal((await api.createSubmission("session", classId, exerciseId, {
    content: " Câu trả lời ", url: "",
  })).id, submissionId);

  respond({ submission: { ...submission, content: "Bản sửa" } }, 200, (url, options) => {
    assert.equal(url, `${CORE_URL}/classes/${classId}/exercises/${exerciseId}/submissions/mine`);
    assert.equal(options.method, "PUT");
  });
  assert.equal((await api.updateMySubmission("session", classId, exerciseId, {
    content: "Bản sửa", url: "",
  })).content, "Bản sửa");
});

test("teacher list preserves grade and rejects duplicate or invalid submissions", async () => {
  respond({ submissions: [{ ...submission, grade: { score: 8.5, feedback: "Tốt" } }] });
  const result = await api.listSubmissions("session", classId, exerciseId);
  assert.equal(result[0].grade.score, 8.5);

  respond({ submissions: [submission, submission] });
  await assert.rejects(api.listSubmissions("session", classId, exerciseId), error => error.code === "INVALID_RESPONSE");
  respond({ submissions: [{ ...submission, grade: { score: 11 } }] });
  await assert.rejects(api.listSubmissions("session", classId, exerciseId), error => error.code === "INVALID_RESPONSE");
});

test("grade validation accepts 0–10 and invalid API input never sends a request", async () => {
  assert.equal(api.validateGradeScore("8,5"), 8.5);
  assert.throws(() => api.validateGradeScore("11"), /0 đến 10/);

  let calls = 0;
  respond({ grade: { submissionId, score: 8.5, feedback: "Tốt" } }, 200, (url, options) => {
    calls += 1;
    assert.equal(url, `${CORE_URL}/classes/${classId}/exercises/${exerciseId}/submissions/${submissionId}/grade`);
    assert.equal(options.method, "PUT");
    assert.deepEqual(JSON.parse(options.body), { score: 8.5, feedback: "Tốt" });
  });
  assert.equal((await api.putGrade("session", classId, exerciseId, submissionId, {
    score: 8.5, feedback: " Tốt ",
  })).score, 8.5);
  await assert.rejects(api.putGrade("session", classId, exerciseId, submissionId, {
    score: 11,
  }), error => error.status === 422);
  assert.equal(calls, 1);
});

