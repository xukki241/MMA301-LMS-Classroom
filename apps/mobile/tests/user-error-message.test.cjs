const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { userErrorMessage, GENERIC_NETWORK_MESSAGE } = require("../src/lib/user-error-message.ts");
const { HttpError } = require("../src/lib/http.ts");

test("fetch failed message with internal URL is replaced", () => {
  const raw = "fetch failed: java.io.IOException: unexpected end of stream on http://127.0.0.1:4999/x";
  assert.equal(userErrorMessage(new Error(raw)), GENERIC_NETWORK_MESSAGE);
  assert.equal(userErrorMessage(new HttpError(raw, 0)), GENERIC_NETWORK_MESSAGE);
  assert.equal(userErrorMessage(new TypeError("Network request failed")), GENERIC_NETWORK_MESSAGE);
  assert.equal(userErrorMessage("boom"), GENERIC_NETWORK_MESSAGE);
});

test("safe server message is kept", () => {
  assert.equal(userErrorMessage(new HttpError("Class not found", 404)), "Class not found");
});
