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

const api = require("../src/lib/tasks-api.ts");
const { CORE_URL } = require("../src/lib/config.ts");
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });

const taskFixture = {
  _id: "66e6b4f73a1b5c0012a41234",
  userId: "user-123",
  title: "Làm bài tập lớn LMS",
  description: "Hoàn thiện task LMS-28",
  priority: "high",
  status: "todo",
  dueDate: "2026-10-15T17:00:00.000Z",
  createdAt: "2026-10-10T00:00:00.000Z",
  updatedAt: "2026-10-10T00:00:00.000Z",
};

function respond(body, status = 200, inspect = () => {}) {
  global.fetch = async (url, options) => {
    inspect(url, options);
    return new Response(JSON.stringify(body), { status });
  };
}

test("normalizeTask chuẩn hóa đúng cấu trúc từ MongoDB ObjectId", () => {
  const normalized = api.normalizeTask(taskFixture);
  assert.equal(normalized.id, "66e6b4f73a1b5c0012a41234");
  assert.equal(normalized.title, "Làm bài tập lớn LMS");
  assert.equal(normalized.priority, "high");
  assert.equal(normalized.status, "todo");
});

test("normalizeTask fallback priority và status mặc định khi thiếu", () => {
  const minimal = { _id: "66e6b4f73a1b5c0012a49999", userId: "user-1", title: "Việc nhỏ" };
  const normalized = api.normalizeTask(minimal);
  assert.equal(normalized.priority, "medium");
  assert.equal(normalized.status, "todo");
});

test("listTasks gửi query params và Authorization header chính xác", async () => {
  respond({ tasks: [taskFixture] }, 200, (url, options) => {
    assert.ok(url.startsWith(`${CORE_URL}/tasks`));
    assert.ok(url.includes("status=pending"));
    assert.ok(url.includes("priority=high"));
    assert.equal(options.headers.Authorization, "Bearer test-token");
  });

  const tasks = await api.listTasks("test-token", { status: "pending", priority: "high" });
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].id, taskFixture._id);
});

test("createTask gửi payload và nhận task mới", async () => {
  respond({ task: taskFixture }, 201, (url, options) => {
    assert.equal(url, `${CORE_URL}/tasks`);
    assert.equal(options.method, "POST");
    assert.equal(options.headers.Authorization, "Bearer test-token");
    const sent = JSON.parse(options.body);
    assert.equal(sent.title, "Làm bài tập lớn LMS");
  });

  const created = await api.createTask("test-token", {
    title: "Làm bài tập lớn LMS",
    priority: "high",
  });
  assert.equal(created.id, taskFixture._id);
});

test("toggleTask gọi đúng endpoint PATCH /tasks/:id/toggle", async () => {
  const toggledFixture = { ...taskFixture, status: "completed" };
  respond({ task: toggledFixture }, 200, (url, options) => {
    assert.equal(url, `${CORE_URL}/tasks/${taskFixture._id}/toggle`);
    assert.equal(options.method, "PATCH");
  });

  const result = await api.toggleTask("test-token", taskFixture._id);
  assert.equal(result.status, "completed");
});

test("deleteTask gọi DELETE /tasks/:id", async () => {
  respond({ success: true, message: "Deleted" }, 200, (url, options) => {
    assert.equal(url, `${CORE_URL}/tasks/${taskFixture._id}`);
    assert.equal(options.method, "DELETE");
  });

  const result = await api.deleteTask("test-token", taskFixture._id);
  assert.equal(result.success, true);
});
