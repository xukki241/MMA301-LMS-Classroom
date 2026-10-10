const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test, afterEach } = require("node:test");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  module._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
};
const api = require("../src/lib/stream-api.ts");
const { http, HttpError } = require("../src/lib/http.ts");
const { streamErrorMessage } = require("../src/lib/stream-errors.ts");
const { CORE_URL } = require("../src/lib/config.ts");
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
const classId = "66e6b4f73a1b5c0012a45678";
const post = { _id: "66e6b4f73a1b5c0012a47777", classId, authorId: "teacher-id",
  content: "Thông báo", createdAt: "2026-09-21T01:00:00.000Z", isDeleted: false };
const comment = { _id: "66e6b4f73a1b5c0012a48888", postId: post._id, authorId: "student-id",
  content: "Em đã đọc", createdAt: "2026-09-21T02:00:00.000Z", isDeleted: false };
function respond(body, status = 200, inspect = () => {}) {
  global.fetch = async (url, options) => {
    inspect(url, options);
    return new Response(JSON.stringify(body), { status });
  };
}
for (const role of ["teacher", "student"]) {
  test(role + " lists the class feed using its bearer token", async () => {
    respond({ posts: [post] }, 200, (url, options) => {
      assert.equal(url, CORE_URL + "/classes/" + classId + "/posts");
      assert.equal(options.method, "GET");
      assert.equal(options.headers.Authorization, "Bearer " + role + "-session");
    });
    const result = await api.listPosts(role + "-session", classId);
    assert.equal(result[0].id, post._id);
    assert.equal(result[0].content, "Thông báo");
    assert.equal(result[0].authorId, "teacher-id");
    assert.equal(result[0].createdAt, post.createdAt);
    assert.equal(result[0].title, undefined);
    assert.equal(result[0].displayName, undefined);
  });
}
test("create Post sends only trimmed content and reads post envelope", async () => {
  respond({ message: "OK", post }, 201, (url, options) => {
    assert.equal(url, CORE_URL + "/classes/" + classId + "/posts");
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), { content: "Thông báo" });
  });
  assert.equal((await api.createPost("session", classId, "  Thông báo \n")).id, post._id);
});
test("create Comment sends only trimmed content and reads comment envelope", async () => {
  respond({ message: "OK", comment }, 201, (url, options) => {
    assert.equal(url, CORE_URL + "/classes/" + classId + "/posts/" + post._id + "/comments");
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), { content: "Em đã đọc" });
  });
  assert.equal((await api.createComment("session", classId, post._id, " Em đã đọc ")).id, comment._id);
});
test("comments use the nested endpoint and preserve server order and author IDs", async () => {
  respond({ comments: [comment, { ...comment, _id: "second", authorId: "teacher-id" }] }, 200, url => {
    assert.equal(url, CORE_URL + "/classes/" + classId + "/posts/" + post._id + "/comments");
  });
  const result = await api.listComments("session", classId, post._id);
  assert.deepEqual(result.map(c => c.id), [comment._id, "second"]);
  assert.deepEqual(result.map(c => c.authorId), ["student-id", "teacher-id"]);
});
for (const [name, status, call] of [
  ["student create Post", 403, () => api.createPost("student", classId, "hello")],
  ["non-member feed", 403, () => api.listPosts("outsider", classId)],
  ["missing Post comments", 404, () => api.listComments("session", classId, post._id)],
  ["non-member Comment", 403, () => api.createComment("outsider", classId, post._id, "hello")],
]) {
  test(name + " propagates HTTP " + status, async () => {
    respond({ error: "private diagnostic", code: "FORBIDDEN" }, status);
    await assert.rejects(call(), e => e instanceof HttpError && e.status === status);
  });
}
test("empty lists are real empty success; malformed envelopes/items never are", async () => {
  respond({ posts: [] });
  assert.deepEqual(await api.listPosts("session", classId), []);
  respond({ comments: [] });
  assert.deepEqual(await api.listComments("session", classId, post._id), []);
  for (const body of [{}, [], { posts: null }, { posts: [{}] }, { posts: [{ ...post, createdAt: "bad" }] },
    { posts: [{ ...post, classId: "other" }] }, { posts: [post, post] }]) {
    respond(body);
    await assert.rejects(api.listPosts("session", classId), e => e.code === "INVALID_RESPONSE");
  }
  for (const body of [{}, { comments: [{ ...comment, postId: "other" }] }, { comments: [comment, comment] }]) {
    respond(body);
    await assert.rejects(api.listComments("session", classId, post._id), e => e.code === "INVALID_RESPONSE");
  }
});
test("malformed mutation success is rejected", async () => {
  respond({ message: "OK" }, 201);
  await assert.rejects(api.createPost("session", classId, "hello"), e => e.code === "INVALID_RESPONSE");
  await assert.rejects(api.createComment("session", classId, post._id, "hello"), e => e.code === "INVALID_RESPONSE");
});
test("validation trims, checks both maximum lengths, and sends nothing on invalid input", async () => {
  let calls = 0;
  respond({ post }, 201, () => calls++);
  for (const input of ["  ", "x".repeat(2001)]) {
    await assert.rejects(api.createPost("session", classId, input), e => e.status === 422);
  }
  for (const input of ["\n", "x".repeat(1001)]) {
    await assert.rejects(api.createComment("session", classId, post._id, input), e => e.status === 422);
  }
  assert.equal(calls, 0);
  await api.createPost("session", classId, " " + "x".repeat(2000) + " ");
  respond({ comment }, 201);
  await api.createComment("session", classId, post._id, "x".repeat(1000));
});
test("feed preserves server order without fabricated or duplicate rows", async () => {
  respond({ posts: [{ ...post, _id: "new" }, post] });
  assert.deepEqual((await api.listPosts("session", classId)).map(p => p.id), ["new", post._id]);
});
test("network failure is typed and mutations are not retried", async () => {
  let calls = 0;
  global.fetch = async () => { calls++; throw new TypeError("sensitive connection detail"); };
  await assert.rejects(api.createPost("session", classId, "hello"),
    e => e instanceof HttpError && e.status === 0 && e.code === "NETWORK_ERROR");
  assert.equal(calls, 1);
});
test("timeout remains a typed network error and external cancellation retains AbortError", async () => {
  global.fetch = (_url, { signal }) => new Promise((_, reject) => {
    signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
  });
  await assert.rejects(http("http://test/timeout", { timeoutMs: 5, retry: 0 }),
    e => e instanceof HttpError && e.code === "NETWORK_ERROR");
  const controller = new AbortController();
  const request = http("http://test/cancel", { signal: controller.signal, retry: 0 });
  controller.abort();
  await assert.rejects(request, e => e.name === "AbortError");
});
for (const status of [400, 401, 403, 404, 409, 413, 422, 429, 500, 503]) {
  test("safe Vietnamese error for status " + status, () => {
    const message = streamErrorMessage(new HttpError("SECRET diagnostic", status));
    assert.ok(message.length > 10);
    assert.ok(!message.includes("SECRET"));
    assert.ok(!message.includes("HTTP"));
  });
}
test("unknown and network errors do not expose raw diagnostics", () => {
  assert.ok(!streamErrorMessage(new Error("SECRET")).includes("SECRET"));
  assert.ok(!streamErrorMessage(new HttpError("SECRET", 0, "NETWORK_ERROR")).includes("SECRET"));
});
test("base class navigation uses existing role-specific endpoints", async () => {
  const { listClasses } = require("../src/lib/classes-api.ts");
  for (const [role, route] of [["teacher", "teaching"], ["student", "enrolled"]]) {
    respond({ classes: [] }, 200, url => assert.equal(url, CORE_URL + "/classes/" + route));
    assert.deepEqual(await listClasses("session", role), []);
  }
});

test("GET retries a transient network failure while preserving typed errors", async () => {
  let calls = 0;
  global.fetch = async () => {
    if (++calls === 1) throw new TypeError("connection interrupted");
    return new Response(JSON.stringify({ posts: [post] }));
  };
  assert.equal((await api.listPosts("session", classId))[0].id, post._id);
  assert.equal(calls, 2);
});
