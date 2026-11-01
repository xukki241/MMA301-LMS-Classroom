const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { test } = require("node:test");

function source(path) {
  return readFileSync(resolve(__dirname, path), "utf8");
}

const roleTabs = source("../src/components/navigation/RoleTabs.tsx");
const webDocument = source("../app/+html.tsx");

test("bottom navigation keeps icon and label visible and does not stick off-screen", () => {
  assert.match(roleTabs, /useSafeAreaInsets/);
  assert.match(roleTabs, /TAB_BAR_CONTENT_HEIGHT\s*=\s*64/);
  assert.match(roleTabs, /height:\s*barHeight/);
  assert.match(roleTabs, /paddingBottom:\s*insets\.bottom/);
  assert.match(roleTabs, /numberOfLines=\{1\}/);
  assert.match(roleTabs, /tabBarHideOnKeyboard:\s*false/);
  assert.match(roleTabs, /translateY:\s*0/);
  assert.match(roleTabs, /position:\s*"relative"/);
  assert.match(roleTabs, /tabBarItemStyle:\s*\{\s*minHeight:\s*48\s*\}/);
  assert.doesNotMatch(roleTabs, /TAB_BAR_CONTENT_HEIGHT\s*=\s*56/);
});

test("web document pins the application root to the visible viewport", () => {
  assert.match(webDocument, /html,\s*body,\s*#root/);
  assert.match(webDocument, /height:\s*100%/);
  assert.match(webDocument, /min-height:\s*100dvh/);
  assert.match(webDocument, /overflow:\s*hidden/);
  assert.match(webDocument, /margin:\s*0/);
});

test("class nested screens keep a visible back header", () => {
  const layout = source("../app/_layout.tsx");
  assert.match(layout, /name="class\/\[id\]\/exercises"/);
  assert.match(layout, /name="class\/\[id\]\/materials"/);
  assert.match(layout, /name="class\/\[id\]\/exercise\/\[exerciseId\]"/);
  assert.match(layout, /name="class\/\[id\]\/exercises"[\s\S]*headerShown:\s*true/);
  assert.match(layout, /name="class\/\[id\]\/materials"[\s\S]*headerShown:\s*true/);
});
