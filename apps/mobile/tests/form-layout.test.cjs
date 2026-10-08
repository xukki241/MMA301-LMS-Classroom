const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { test } = require("node:test");

function source(path) {
  return readFileSync(resolve(__dirname, path), "utf8");
}

const login = source("../app/(auth)/login.tsx");
const register = source("../app/(auth)/register.tsx");
const forgot = source("../app/(auth)/forgot-password.tsx");
const classes = source("../src/screens/ClassesWorkspace.tsx");
const screen = source("../src/components/ui/Screen.tsx");
const button = source("../src/components/ui/AppButton.tsx");

function styleBlock(file, name) {
  const start = file.indexOf(`${name}: {`);
  assert.ok(start >= 0, name);
  const end = file.indexOf("\n  },", start);
  assert.ok(end > start, name);
  return file.slice(start, end);
}

test("auth notices stay in document flow and fields keep their own errors", () => {
  for (const file of [login, register, forgot]) {
    assert.match(file, /keyboardBehavior/);
    assert.match(file, /automaticallyAdjustKeyboardInsets/);
    assert.match(file, /FormNotice/);
    assert.match(file, /FieldError/);
    assert.match(styleBlock(file, "scrollContent"), /paddingBottom: 96/);
    assert.doesNotMatch(styleBlock(file, "scrollContent"), /justifyContent/);
    assert.doesNotMatch(file, /position:\s*"absolute"/);
  }
  assert.match(login, /FieldError message=\{emailError\}/);
  assert.match(login, /FieldError message=\{passwordError\}/);
  assert.match(register, /FieldError message=\{field === "displayName" \? notice : null\}/);
  assert.match(register, /FieldError message=\{field === "confirmPassword" \? notice : null\}/);
  assert.match(forgot, /FieldError message=\{error\}/);
  assert.match(login, /minHeight: 44/);
  assert.match(register, /minHeight: 44/);
  assert.match(forgot, /minHeight: 44/);
});

test("class create errors sit under the field and list states stay exclusive", () => {
  assert.match(classes, /FieldError message=\{inputError\}/);
  const exclusive = classes.indexOf("classesQuery.isPending ?");
  const errorBranch = classes.indexOf(": classesQuery.isError ?");
  const emptyBranch = classes.indexOf(": classes.length === 0 ?");
  assert.ok(exclusive > 0 && exclusive < errorBranch && errorBranch < emptyBranch);
  assert.doesNotMatch(classes, /classesQuery\.isPending \? <ClassListSkeleton \/> : null/);
});

test("shared screen and buttons keep errors reachable", () => {
  assert.match(screen, /automaticallyAdjustKeyboardInsets=\{keyboardInset\}/);
  assert.match(button, /minHeight: 44/);
});
