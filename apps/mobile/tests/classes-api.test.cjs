const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test, afterEach } = require("node:test");
const ts = require("typescript");

// Compile the actual service with the project's TypeScript, without another test dependency.
require.extensions[".ts"] = (module, filename) => {
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(outputText, filename);
};

const api = require("../src/lib/classes-api.ts");
const { http, HttpError } = require("../src/lib/http.ts");
const { CORE_URL } = require("../src/lib/config.ts");
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });

// Fixtures follow LMS-05's Mongo serialization. Only the HTTP boundary is substituted.
const cls = {
  _id: "66e6b4f73a1b5c0012a45678", name: "MMA301", code: "A8K92Z",
  teacherId: "66e6b4f73a1b5c0012a40001",
  createdAt: "2026-09-21T01:00:00.000Z", updatedAt: "2026-09-21T01:00:00.000Z", __v: 0,
};
const member = {
  _id: "66e6b4f73a1b5c0012a49999", classId: cls._id,
  userId: "66e6b4f73a1b5c0012a40002", roleInClass: "student",
  createdAt: cls.createdAt, updatedAt: cls.updatedAt, __v: 0,
};
function respond(body, status = 200, inspect = () => {}) {
  global.fetch = async (url, options) => {
    inspect(url, options);
    return new Response(JSON.stringify(body), { status });
  };
}

for (const [role, path] of [["teacher", "teaching"], ["student", "enrolled"]]) {
  test(`${role} list uses the membership endpoint and session token`, async () => {
    respond({ classes: [cls] }, 200, (url, options) => {
      assert.equal(url, `${CORE_URL}/classes/${path}`);
      assert.equal(options.method, "GET");
      assert.equal(options.headers.Authorization, "Bearer test-session");
    });
    const result = await api.listClasses("test-session", role);
    assert.equal(result[0].id, cls._id);
    assert.equal(result[0].name, "MMA301");
  });
}

test("empty list is accepted, malformed list is rejected instead of fake empty success", async () => {
  respond({ classes: [] });
  assert.deepEqual(await api.listClasses("test-session", "student"), []);
  respond({ items: [] });
  await assert.rejects(api.listClasses("test-session", "student"));
  respond({ classes: [{ _id: cls._id }] });
  await assert.rejects(api.listClasses("test-session", "student"));
});

test("create sends only trimmed name and returns the server's class code", async () => {
  respond({ message: "Tạo lớp học thành công", class: cls }, 201, (url, options) => {
    assert.equal(url, `${CORE_URL}/classes`);
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), { name: "MMA301" });
  });
  assert.equal((await api.createClass("test-session", "  MMA301  ")).code, "A8K92Z");
});

test("join trims and uppercases code and reads the class envelope", async () => {
  respond({ message: "Tham gia lớp học thành công", class: cls, membership: member }, 200, (url, options) => {
    assert.equal(url, `${CORE_URL}/classes/join`);
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), { code: "A8K92Z" });
  });
  assert.equal((await api.joinClass("test-session", " a8k92z ")).id, cls._id);
});

test("invalid form inputs never send a request", async () => {
  let calls = 0;
  respond({ class: cls }, 200, () => { calls += 1; });
  for (const name of ["  ", "x".repeat(101)]) {
    await assert.rejects(api.createClass("test-session", name), (e) => e.status === 422);
  }
  for (const code of ["  ", "ABC", "ABCDEFG"]) {
    await assert.rejects(api.joinClass("test-session", code), (e) => e.status === 422);
  }
  assert.equal(calls, 0);
});

test("detail preserves membership role; members preserve IDs and roles supplied by Core", async () => {
  respond({ class: cls, roleInClass: "student" }, 200, (url) => {
    assert.equal(url, `${CORE_URL}/classes/${cls._id}`);
  });
  const detail = await api.getClass("test-session", cls._id);
  assert.equal(detail.class.id, cls._id);
  assert.equal(detail.roleInClass, "student");
  respond({ members: [member] }, 200, (url) => {
    assert.equal(url, `${CORE_URL}/classes/${cls._id}/members`);
  });
  const members = await api.getClassMembers("test-session", cls._id);
  assert.equal(members[0].userId, member.userId);
  assert.equal(members[0].roleInClass, "student");
});

test("403 ALREADY_JOINED retains the backend code and is never treated as success", async () => {
  respond({ error: "Bạn đã là thành viên của lớp học này", code: "ALREADY_JOINED" }, 403);
  await assert.rejects(api.joinClass("test-session", "A8K92Z"), (e) => {
    assert.ok(e instanceof HttpError);
    assert.equal(e.status, 403);
    assert.equal(e.code, "ALREADY_JOINED");
    return true;
  });
});

for (const status of [401, 403, 404, 409]) {
  test(`HTTP ${status} propagates without retries or fabricated class data`, async () => {
    let calls = 0;
    respond({ error: "private server detail", code: "FORBIDDEN" }, status, () => { calls += 1; });
    await assert.rejects(api.getClass("test-session", cls._id), (e) => e.status === status);
    assert.equal(calls, 1);
  });
}

test("failed writes are not retried and network failures are typed", async () => {
  let calls = 0;
  global.fetch = async () => { calls += 1; throw new TypeError("Failed to fetch"); };
  await assert.rejects(api.createClass("test-session", "MMA301"), (e) => e.code === "NETWORK_ERROR");
  assert.equal(calls, 1);
});

test("timeouts have a network error code, caller cancellation remains an abort", async () => {
  global.fetch = (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
  });
  await assert.rejects(http(`${CORE_URL}/classes`, { timeoutMs: 5, retry: 0 }), (e) => e.code === "NETWORK_ERROR");
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(http(`${CORE_URL}/classes`, { signal: controller.signal }), (e) => e.name === "AbortError");
});

test("class errors distinguish invalid code, duplicate membership, access and session failures", () => {
  const { classErrorMessage } = require("../src/lib/class-errors.ts");
  for (const [status, code, operation, expected] of [
    [400, undefined, "list", /Dữ liệu không hợp lệ/],
    [401, "INVALID_TOKEN", "detail", /Phiên đăng nhập đã hết hạn/],
    [403, "FORBIDDEN", "detail", /không có quyền/],
    [403, "ALREADY_JOINED", "join", /đã tham gia/],
    [409, undefined, "join", /đã tham gia/],
    [404, "CLASS_NOT_FOUND", "join", /Mã lớp không hợp lệ/],
    [404, "CLASS_NOT_FOUND", "detail", /Không tìm thấy lớp học/],
    [422, "VALIDATION_ERROR", "create", /1 đến 100/],
    [422, "VALIDATION_ERROR", "join", /6 ký tự/],
    [500, "INTERNAL", "list", /Máy chủ đang gặp sự cố/],
    [0, "NETWORK_ERROR", "list", /kiểm tra kết nối mạng/],
  ]) {
    const message = classErrorMessage(new HttpError("sensitive server diagnostic", status, code), operation);
    assert.match(message, expected);
    assert.doesNotMatch(message, /sensitive/);
  }
  assert.doesNotMatch(classErrorMessage(new Error("private stack info")), /private/);
});
