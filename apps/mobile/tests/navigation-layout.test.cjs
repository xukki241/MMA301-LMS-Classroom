const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { test } = require("node:test");

function source(path) {
  return readFileSync(resolve(__dirname, path), "utf8");
}

const roleTabs = source("../src/components/navigation/RoleTabs.tsx");
const webDocument = source("../app/+html.tsx");

test("bottom navigation reserves a touch-friendly safe-area slot and hides for the keyboard", () => {
  assert.match(roleTabs, /useSafeAreaInsets/);
  assert.match(roleTabs, /TAB_BAR_CONTENT_HEIGHT\s*=\s*56/);
  assert.match(roleTabs, /height:\s*TAB_BAR_CONTENT_HEIGHT\s*\+\s*insets\.bottom/);
  assert.match(roleTabs, /paddingBottom:\s*insets\.bottom/);
  assert.match(roleTabs, /tabBarHideOnKeyboard:\s*true/);
  assert.match(roleTabs, /tabBarItemStyle:\s*\{\s*minHeight:\s*48\s*\}/);
});

test("web document pins the application root to the visible viewport", () => {
  assert.match(webDocument, /html,\s*body,\s*#root/);
  assert.match(webDocument, /height:\s*100%/);
  assert.match(webDocument, /min-height:\s*100dvh/);
  assert.match(webDocument, /overflow:\s*hidden/);
  assert.match(webDocument, /margin:\s*0/);
});
