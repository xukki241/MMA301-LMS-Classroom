const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { test } = require("node:test");

const root = (path) => resolve(__dirname, "..", path);
const source = (path) => readFileSync(root(path), "utf8");

const TABS = ["index", "schedule", "work", "classes", "profile"];

test("both roles expose the same five tab routes", () => {
  for (const role of ["(student)", "(teacher)"]) {
    for (const tab of TABS) {
      assert.ok(existsSync(root(`app/${role}/${tab}.tsx`)), `${role}/${tab}.tsx is missing`);
    }
  }
});

test("RoleTabs registers the five tabs in order with Vietnamese titles", () => {
  const tabs = source("src/components/navigation/RoleTabs.tsx");
  const names = [...tabs.matchAll(/name:\s*"([a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual(names, TABS);
  for (const title of ["Trang chủ", "Lịch", "Việc", "Lớp", "Tôi"]) {
    assert.match(tabs, new RegExp(`title:\\s*"${title}"`));
  }
});

test("stack registers class schedule and gradebook screens", () => {
  const layout = source("app/_layout.tsx");
  assert.match(layout, /name="class\/\[id\]\/schedule"/);
  assert.match(layout, /name="gradebook"/);
  assert.ok(existsSync(root("app/class/[id]/schedule.tsx")));
  assert.ok(existsSync(root("app/gradebook.tsx")));
});

test("home dashboard is a grouped shortcut grid fed by the overview query", () => {
  const home = source("src/screens/HomeDashboard.tsx");
  assert.match(home, /useOverviewQuery/);
  for (const group of ["Truy cập thông tin", "Báo cáo", "Việc cần làm", "Cần chấm", "Lớp gần đây"]) {
    assert.ok(home.includes(group), `missing group: ${group}`);
  }
  for (const tile of ["Lịch học", "Lịch kiểm tra", "Bảng điểm", "Chấm bài"]) {
    assert.ok(home.includes(tile), `missing tile: ${tile}`);
  }
});

test("class workspace lets teachers manage students, schedule and resources", () => {
  const detail = source("app/class/[id].tsx");
  assert.match(detail, /removeMember/);
  assert.match(detail, /member\.displayName/);
  assert.match(detail, /\/class\/\[id\]\/schedule/);
  const materials = source("app/class/[id]/materials.tsx");
  assert.match(materials, /updateMaterial/);
  assert.match(materials, /Sửa tài liệu/);
  const schedule = source("app/class/[id]/schedule.tsx");
  assert.match(schedule, /createSession/);
  assert.match(schedule, /createExam/);
  assert.match(schedule, /isTeacher/);
});

test("schedule and work screens use role-specific filters and empty states", () => {
  const work = source("src/screens/WorkScreen.tsx");
  assert.match(work, /needs_grading/);
  assert.match(work, /overdue/);
  assert.match(work, /: "all"/);
  assert.match(work, /isTeacher \? "Chấm bài" : "Bài tập"/);
  assert.doesNotMatch(work, /isTeacher \? "needs_grading" : "todo"/);
  assert.doesNotMatch(work, /"Việc của tôi"/);
  const schedule = source("src/screens/ScheduleScreen.tsx");
  assert.match(schedule, /Lịch học/);
  assert.match(schedule, /Lịch kiểm tra/);
  assert.match(schedule, /Quản lý lịch theo lớp/);
  assert.match(schedule, /markedCounts/);
  assert.match(schedule, /mode=\{view\}/);
  assert.doesNotMatch(schedule, /markedDays/);
});

test("month calendar renders count badges instead of faint dots", () => {
  const calendar = source("src/components/schedule/MonthCalendar.tsx");
  assert.match(calendar, /markedCounts/);
  assert.match(calendar, /mode === "exams"/);
  assert.match(calendar, /styles\.badge/);
  assert.doesNotMatch(calendar, /styles\.dot\b/);
  assert.doesNotMatch(calendar, /markedDays/);
});
