const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test, afterEach } = require("node:test");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { QueryClient } = require("@tanstack/react-query");
const queries = require("../src/lib/stream-query.ts");
const { HttpError } = require("../src/lib/http.ts");
const { streamAccessDenied } = require("../src/lib/stream-errors.ts");
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
const session = { userId: "teacher", token: "session", classId: "class-a" };
const post = { id: "post-a", classId: "class-a", authorId: "teacher", content: "Thông báo", createdAt: "2026-09-21T01:00:00.000Z" };
const comment = { id: "comment-a", postId: "post-a", authorId: "student", content: "Em đã đọc", createdAt: post.createdAt };
function client() { return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } }); }
function respond(entry, name) {
  const { id, ...rest } = entry;
  global.fetch = async () => new Response(JSON.stringify({ [name]: { _id: id, ...rest } }), { status: 201 });
}
test("queries separate account, class and post without putting tokens in keys", () => {
  assert.deepEqual(queries.postsOptions(session).queryKey, ["stream", "teacher", "class-a", "posts"]);
  assert.deepEqual(queries.commentsOptions(session, "post-a").queryKey, ["stream", "teacher", "class-a", "post-a", "comments"]);
  const c = client();
  c.setQueryData(queries.postsOptions(session).queryKey, [post]);
  assert.equal(c.getQueryData(queries.postsOptions({ ...session, userId: "student" }).queryKey), undefined);
  assert.equal(c.getQueryData(queries.postsOptions({ ...session, classId: "class-b" }).queryKey), undefined);
  c.clear();
});
test("created Post uses server row once and invalidates only this account/class feed", async () => {
  const c = client();
  const key = queries.postsOptions(session).queryKey;
  const other = queries.postsOptions({ ...session, classId: "class-b" }).queryKey;
  c.setQueryData(key, [post]);
  c.setQueryData(other, []);
  respond(post, "post");
  await c.getMutationCache().build(c, queries.createPostOptions(c, session)).execute("Thông báo");
  assert.deepEqual(c.getQueryData(key), [post]);
  assert.equal(c.getQueryState(key).isInvalidated, true);
  assert.equal(c.getQueryState(other).isInvalidated, false);
  c.clear();
});
test("Comment creation appends server result once and invalidates only its thread", async () => {
  const c = client();
  const key = queries.commentsOptions(session, "post-a").queryKey;
  const other = queries.commentsOptions(session, "post-b").queryKey;
  c.setQueryData(key, []);
  c.setQueryData(other, []);
  respond(comment, "comment");
  const options = queries.createCommentOptions(c, session, "post-a");
  await c.getMutationCache().build(c, options).execute("Em đã đọc");
  await c.getMutationCache().build(c, options).execute("Em đã đọc");
  assert.deepEqual(c.getQueryData(key), [comment]);
  assert.equal(c.getQueryState(key).isInvalidated, true);
  assert.equal(c.getQueryState(other).isInvalidated, false);
  c.clear();
});
test("failed creation keeps cache unchanged and sends one request", async () => {
  const c = client();
  const key = queries.postsOptions(session).queryKey;
  c.setQueryData(key, []);
  let calls = 0;
  global.fetch = async () => { calls++; return new Response('{"error":"Forbidden"}', { status: 403 }); };
  await assert.rejects(c.getMutationCache().build(c, queries.createPostOptions(c, session)).execute("hello"));
  assert.deepEqual(c.getQueryData(key), []);
  assert.equal(calls, 1);
  c.clear();
});
test("late result from previous account cannot populate next account cache", async () => {
  const c = client();
  let resolve;
  global.fetch = () => new Promise(r => { resolve = r; });
  const request = c.getMutationCache().build(c, queries.createPostOptions(c, session)).execute("hello");
  await new Promise(r => setImmediate(r));
  c.clear();
  resolve(new Response(JSON.stringify({ post: { ...post, _id: post.id } }), { status: 201 }));
  await request;
  assert.equal(c.getQueryData(queries.postsOptions({ ...session, userId: "student" }).queryKey), undefined);
  c.clear();
});
test("cached success is hidden for lost permissions/deleted posts, not a network refresh error", () => {
  for (const status of [401, 403, 404]) assert.equal(streamAccessDenied(new HttpError("private", status)), true);
  assert.equal(streamAccessDenied(new HttpError("private", 0)), false);
});
