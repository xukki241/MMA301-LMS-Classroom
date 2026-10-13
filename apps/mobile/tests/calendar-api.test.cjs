const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test, afterEach } = require("node:test");
const ts = require("typescript");

// Compile TypeScript module on the fly
require.extensions[".ts"] = (module, filename) => {
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(outputText, filename);
};

const api = require("../src/lib/calendar-api.ts");
const { CORE_URL } = require("../src/lib/config.ts");
const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});

const exerciseEventFixture = {
  id: "exercise_66e6b4f73a1b5c0012a41111",
  type: "exercise",
  title: "Bài tập lớn React Native",
  description: "Xây dựng màn hình Calendar",
  dueAt: "2026-10-25T17:00:00.000Z",
  classId: "66e6b4f73a1b5c0012a40001",
  className: "Lập trình Di động MMA301",
  classCode: "MMA301",
  exerciseId: "66e6b4f73a1b5c0012a41111",
  status: "graded",
  isOverdue: false,
  submissionId: "66e6b4f73a1b5c0012a42222",
  grade: 9.8,
};

const taskEventFixture = {
  id: "task_66e6b4f73a1b5c0012a43333",
  type: "task",
  title: "Họp nhóm đồ án",
  description: "Phân công task LMS-29",
  dueAt: "2026-10-22T09:00:00.000Z",
  priority: "high",
  status: "pending",
  isOverdue: false,
};

function respond(body, status = 200, inspect = () => {}) {
  global.fetch = async (url, options) => {
    inspect(url, options);
    return new Response(JSON.stringify(body), { status });
  };
}

test("normalizeCalendarEvent chuẩn hóa đúng sự kiện bài tập (Exercise)", () => {
  const event = api.normalizeCalendarEvent(exerciseEventFixture);
  assert.equal(event.id, "exercise_66e6b4f73a1b5c0012a41111");
  assert.equal(event.type, "exercise");
  assert.equal(event.title, "Bài tập lớn React Native");
  assert.equal(event.className, "Lập trình Di động MMA301");
  assert.equal(event.status, "graded");
  assert.equal(event.grade, 9.8);
  assert.equal(event.isOverdue, false);
});

test("normalizeCalendarEvent chuẩn hóa đúng sự kiện việc cá nhân (Task)", () => {
  const event = api.normalizeCalendarEvent(taskEventFixture);
  assert.equal(event.id, "task_66e6b4f73a1b5c0012a43333");
  assert.equal(event.type, "task");
  assert.equal(event.priority, "high");
  assert.equal(event.status, "pending");
});

test("normalizeCalendarEvent fallback an toàn khi thiếu thuộc tính tùy chọn", () => {
  const minimal = { id: "ex_minimal", title: "Việc nhỏ", dueAt: "2026-10-20T00:00:00.000Z" };
  const event = api.normalizeCalendarEvent(minimal);
  assert.equal(event.type, "exercise");
  assert.equal(event.status, "pending");
  assert.equal(event.isOverdue, false);
});

test("listCalendarEvents gửi query params và Authorization header chính xác", async () => {
  respond(
    {
      success: true,
      events: [exerciseEventFixture, taskEventFixture],
      summary: { total: 2, exercises: 1, tasks: 1, pending: 1, completed: 1, overdue: 0 },
    },
    200,
    (url, options) => {
      assert.ok(url.startsWith(`${CORE_URL}/calendar/events`));
      assert.ok(url.includes("from=2026-10-01"));
      assert.ok(url.includes("to=2026-10-31"));
      assert.ok(url.includes("type=exercise"));
      assert.ok(url.includes("status=pending"));
      assert.equal(options.headers.Authorization, "Bearer sample-token");
    }
  );

  const res = await api.listCalendarEvents("sample-token", {
    from: "2026-10-01",
    to: "2026-10-31",
    type: "exercise",
    status: "pending",
  });

  assert.equal(res.events.length, 2);
  assert.equal(res.summary.total, 2);
  assert.equal(res.summary.exercises, 1);
  assert.equal(res.summary.tasks, 1);
});

test("listCalendarEvents tự động tính summary mặc định nếu server không trả về summary", async () => {
  respond({ success: true, events: [exerciseEventFixture, taskEventFixture] }, 200);

  const res = await api.listCalendarEvents("sample-token");
  assert.equal(res.events.length, 2);
  assert.equal(res.summary.total, 2);
  assert.equal(res.summary.exercises, 1);
  assert.equal(res.summary.tasks, 1);
});
