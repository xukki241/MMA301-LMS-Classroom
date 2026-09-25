const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { test } = require("node:test");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { HttpError } = require("../src/lib/http.ts");
const errors = require("../src/lib/stream-errors.ts");
const jsx = (type, props) => ({ type, props });
// Exercise the actual screen's render branches and refresh callbacks. Native views
// and hook state are supplied at the platform boundary; no device renderer is used.
function harness(kind, status = 403, classRole = "teacher") {
  const query = { data: [{ id: "row", authorId: "author", content: "protected content", createdAt: "2026-09-21" }],
    error: null, isPending: false, isError: false, isFetching: false,
    refetch: async () => ({ isSuccess: true }) };
  const mutation = { error: new HttpError("denied", status), isPending: false,
    reset() { mutation.error = null; } };
  const detail = { data: { roleInClass: classRole }, isSuccess: true, isPending: false,
    isFetching: false, isError: false, error: null, refetch: async () => ({ isSuccess: true }) };
  const mocks = {
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
    react: { useState: value => [value, () => {}], useCallback: callback => callback },
    "@tanstack/react-query": { useQuery: options => options.queryKey?.[0] === "classes" ? detail : query,
      useMutation: () => mutation, useQueryClient: () => ({}) },
    "expo-router": { Redirect: "Redirect", useFocusEffect: () => {} },
    "expo-router/react-navigation": { useHeaderHeight: () => 0 },
    "react-native": { KeyboardAvoidingView: "KeyboardAvoidingView", RefreshControl: "RefreshControl",
      View: "View", Platform: { OS: "ios" }, StyleSheet: { create: value => value } },
    "react-native-paper": { ActivityIndicator: "ActivityIndicator", Card: Object.assign(() => {}, { Content: "CardContent" }),
      Text: "Text", Divider: "Divider" },
  };
  const local = {
    Screen: { Screen: "Screen" }, AppButton: { AppButton: "AppButton" }, EmptyState: { EmptyState: "EmptyState" },
    StreamComposer: { StreamComposer: "StreamComposer" }, StreamRequestError: { StreamRequestError: "StreamRequestError" },
    CommentThread: { CommentThread: "CommentThread" }, "stream-errors": errors,
    "auth-context": { useAuth: () => ({ user: { id: "teacher", role: "teacher" }, token: "test-session" }) },
    http: { HttpError }, "stream-api": { POST_MAX_LENGTH: 2000, COMMENT_MAX_LENGTH: 1000 },
    "classes-api": { getClass: () => Promise.resolve(detail.data) },
    "query-client": { queryKeys: { class: () => ["classes", "teacher", "detail", "class-a"] } },
    "stream-query": { postsOptions: () => ({}), commentsOptions: () => ({}), createPostOptions: () => ({}), createCommentOptions: () => ({}) },
    tokens: { spacing: {}, typography: {} },
  };
  const filename = resolve(__dirname, kind === "feed" ? "../src/screens/ClassStreamScreen.tsx" : "../src/components/stream/CommentThread.tsx");
  const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  new Function("require", "exports", compiled)(name => {
    const result = mocks[name] || local[name.split("/").pop()];
    assert.ok(result, "Unexpected dependency: " + name);
    return result;
  }, exports);
  function render() {
    const node = kind === "feed" ? exports.default({ classId: "class-a" }) : exports.CommentThread({ session: {}, postId: "post-a" });
    return kind === "feed" ? node.type(node.props) : node;
  }
  return { query, mutation, detail, render };
}
function nodes(node) {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!node || typeof node !== "object") return [];
  return [node, ...nodes(node.props?.children)];
}
for (const kind of ["feed", "comments"]) {
  test(kind + " hides cached content and composer after denied creation", () => {
    for (const status of [401, 403, 404]) {
      const h = harness(kind, status);
      const tree = nodes(h.render());
      assert.equal(tree.some(n => n.type === "StreamComposer"), false);
      assert.equal(tree.some(n => n.props?.post || n.props?.children === "protected content"), false);
      assert.ok(tree.some(n => n.type === "StreamRequestError" && n.props.error === h.mutation.error));
    }
  });
  test(kind + " successful refresh recovers from denied creation, failed refresh does not", async () => {
    const h = harness(kind);
    const refresh = () => nodes(h.render()).find(n => n.type === "AppButton" && n.props.mode === "text").props.onPress();
    h.query.refetch = async () => ({ isSuccess: false });
    refresh();
    await new Promise(r => setImmediate(r));
    assert.equal(nodes(h.render()).some(n => n.type === "StreamComposer"), false);
    h.query.refetch = async () => ({ isSuccess: true });
    refresh();
    await new Promise(r => setImmediate(r));
    assert.equal(nodes(h.render()).some(n => n.type === "StreamComposer"), true);
  });
}
test("global teacher with student membership cannot see Post composer", () => {
  const h = harness("feed", 0, "student");
  h.mutation.error = null;
  assert.equal(nodes(h.render()).some(n => n.type === "StreamComposer"), false);
});
