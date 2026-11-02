const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { test } = require("node:test");
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  module._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
};

const root = (path) => resolve(__dirname, "..", "..", "..", path);
const mobile = (path) => resolve(__dirname, "..", path);
const source = (path) => readFileSync(mobile(path), "utf8");
const rules = require("../src/components/navigation/tab-bar-rules.ts");
const urls = require("../src/lib/safe-url.ts");

test("tab bar stays visible when the keyboard event is a stuck nav-bar inset", () => {
  assert.equal(rules.shouldHideTabBar({
    platform: "android", keyboardHeight: 48, keyboardVisible: true, windowShortfall: 48,
  }), false);
  assert.equal(rules.shouldHideTabBar({
    platform: "android", keyboardHeight: 320, keyboardVisible: true, windowShortfall: 40,
  }), false);
  assert.equal(rules.shouldHideTabBar({
    platform: "android", keyboardHeight: 320, keyboardVisible: true, windowShortfall: 320,
  }), true);
  assert.equal(rules.shouldHideTabBar({
    platform: "android", keyboardHeight: 320, keyboardVisible: false, windowShortfall: 320,
  }), false);
  assert.equal(rules.shouldHideTabBar({
    platform: "web", keyboardHeight: 320, keyboardVisible: true, windowShortfall: 320,
  }), false);
  assert.equal(rules.shouldHideTabBar({
    platform: "ios", keyboardHeight: 280, keyboardVisible: true, windowShortfall: 0,
  }), true);
});

test("material and submission links accept only http and https", () => {
  assert.equal(urls.isSafeHttpUrl("https://example.com/a"), true);
  assert.equal(urls.isSafeHttpUrl("http://example.com/a"), true);
  assert.equal(urls.isSafeHttpUrl("javascript:alert(1)"), false);
  assert.equal(urls.isSafeHttpUrl("data:text/html,hi"), false);
  assert.equal(urls.isSafeHttpUrl("  "), false);
});

test("home hub refetches overview without cancelling in-flight requests", () => {
  const home = source("src/screens/HomeDashboard.tsx");
  assert.match(home, /useOverviewQuery/);
  assert.match(home, /cancelRefetch:\s*false/);
  assert.match(home, /refreshing=\{pulling\}/);
  assert.doesNotMatch(home, /refreshing=\{query\.isRefetching\}/);
  assert.doesNotMatch(home, /useClassesQuery/);
});

test("schedule and work follow route shortcuts instead of a stale local pick", () => {
  const schedule = source("src/screens/ScheduleScreen.tsx");
  const work = source("src/screens/WorkScreen.tsx");
  assert.match(schedule, /setFilter\(routeFilter\)/);
  assert.match(work, /setFilter\(routeFilter\)/);
  assert.match(schedule, /cancelRefetch:\s*false/);
  assert.match(work, /cancelRefetch:\s*false/);
  assert.match(schedule, /refreshing=\{pulling\}/);
  assert.match(work, /refreshing=\{pulling\}/);
  assert.match(work, /filters\.includes\(rawFilter as WorkFilter\)[\s\S]*?: "all"/);
  assert.match(schedule, /new Map<number, number>\(\)/);
});

test("gradebook is student-only and profile surfaces overview errors", () => {
  const gradebook = source("src/screens/GradebookScreen.tsx");
  const profile = source("src/screens/ProfileScreen.tsx");
  assert.match(gradebook, /user\?\.role === "teacher"/);
  assert.match(gradebook, /Redirect href="\/\(teacher\)\/work"/);
  assert.match(gradebook, /cancelRefetch:\s*false/);
  assert.match(profile, /overviewQuery\.isError/);
  assert.match(profile, /onRetry=\{/);
  assert.match(profile, /cancelRefetch:\s*false/);
  assert.match(profile, /\/account/);
  assert.match(profile, /\/change-password/);
  assert.doesNotMatch(profile, /PHIÊN LÀM VIỆC|Core xác nhận|10\.0\.2\.2/);
});

test("class schedule and materials refresh on focus and lift dialogs above the keyboard", () => {
  const schedule = source("app/class/[id]/schedule.tsx");
  const materials = source("app/class/[id]/materials.tsx");
  assert.match(schedule, /useFocusEffect/);
  assert.match(schedule, /cancelRefetch:\s*false/);
  assert.match(schedule, /marginBottom:\s*keyboardLift/);
  assert.match(schedule, /refreshing=\{pulling\}/);
  assert.match(materials, /useFocusEffect/);
  assert.match(materials, /cancelRefetch:\s*false/);
  assert.match(materials, /isSafeHttpUrl/);
  assert.match(materials, /disabled=\{createMutation\.isPending \|\| updateMutation\.isPending\}/);
});

test("stack screens with a header do not add the top safe area twice", () => {
  const screen = source("src/components/ui/Screen.tsx");
  assert.match(screen, /HeaderShownContext/);
  assert.match(screen, /headerShown \? \["left", "right"\] : \["top", "left", "right"\]/);
  assert.match(screen, /insets\.bottom/);
});

test("teacher overview includes owned classes and done requires a fully graded submission", () => {
  const overview = readFileSync(root("services/core-api/src/services/overview.service.ts"), "utf8");
  assert.match(overview, /teacherId: user\.id/);
  assert.match(overview, /mine\.length === 0\) status = "closed"/);
  assert.match(overview, /pending > 0\) status = "needs_grading"/);
  assert.match(overview, /gradedCount === mine\.length\) status = "done"/);
});

test("deleting a class also deletes its sessions and exams", () => {
  const service = readFileSync(root("services/core-api/src/services/class.service.ts"), "utf8");
  assert.match(service, /ClassSession\.deleteMany\(\{ classId \}\)/);
  assert.match(service, /Exam\.deleteMany\(\{ classId \}\)/);
});

test("material patch schema caps title and description", () => {
  const controller = readFileSync(root("services/core-api/src/controllers/material.controller.ts"), "utf8");
  assert.match(controller, /updateMaterialSchema/);
  assert.match(controller, /\.max\(200/);
  assert.match(controller, /\.max\(1000/);
  assert.match(controller, /parseUpdate\(req\.body\)/);
});

test("core package declares test:lms15 once", () => {
  const pkg = readFileSync(root("services/core-api/package.json"), "utf8");
  assert.equal(pkg.match(/"test:lms15"/g).length, 1);
});
