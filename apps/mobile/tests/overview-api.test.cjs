const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { afterEach, test } = require("node:test");
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  module._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
};

const o = require("../src/lib/overview-api.ts");
const s = require("../src/lib/schedule-api.ts");
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });

// Thứ Hai 12/10/2026 08:00 giờ địa phương.
const now = new Date(2026, 9, 12, 8, 0);
const mk = (weekday, startTime = "07:30", endTime = "09:30") => ({
  id: `s${weekday}${startTime}`, classId: "c1", className: "MMA301", weekday, startTime, endTime, room: "A1", note: "",
});
const work = (over) => ({
  exerciseId: "e", classId: "c1", className: "MMA301", title: "BT", dueAt: "2026-10-14T00:00:00.000Z",
  status: "todo", score: null, feedback: "", submissionCount: 0, gradedCount: 0, ...over,
});

test("parseOverview accepts a valid student payload and rejects malformed rows", () => {
  const ok = o.parseOverview({
    role: "student",
    classes: [{ id: "c1", name: "MMA301", code: "ABC123" }],
    sessions: [{ _id: "s1", classId: "c1", className: "MMA301", weekday: 2, startTime: "07:30", endTime: "09:30" }],
    exams: [{ _id: "x1", classId: "c1", className: "MMA301", title: "Giữa kỳ", startsAt: "2026-10-20T01:00:00.000Z", durationMinutes: 60 }],
    work: [{ exerciseId: "e1", classId: "c1", className: "MMA301", title: "BT1", dueAt: "2026-10-14T00:00:00.000Z", status: "graded", score: 9 }],
  });
  assert.equal(ok.sessions[0].id, "s1");
  assert.equal(ok.work[0].score, 9);
  assert.throws(() => o.parseOverview({ role: "admin", classes: [], sessions: [], exams: [], work: [] }), /không hợp lệ/);
  assert.throws(() => o.parseOverview({ role: "student", classes: [], sessions: [{ _id: "s", classId: "c", weekday: 9, startTime: "a", endTime: "b" }], exams: [], work: [] }), /không hợp lệ/);
  assert.throws(() => o.parseOverview(null), /không hợp lệ/);
});

test("fetchOverview calls /me/overview with the bearer token", async () => {
  let seen;
  global.fetch = async (url, options) => {
    seen = { url, auth: options.headers.Authorization };
    return new Response(JSON.stringify({ role: "teacher", classes: [], sessions: [], exams: [], work: [] }), { status: 200 });
  };
  const result = await o.fetchOverview("tok");
  assert.match(seen.url, /\/me\/overview$/);
  assert.equal(seen.auth, "Bearer tok");
  assert.equal(result.role, "teacher");
});

test("upcomingSessions expands weekly sessions in time order across days", () => {
  const sessions = [mk(1, "13:00", "15:00"), mk(1, "07:30"), mk(2), mk(0)];
  const week = o.upcomingSessions(sessions, now, 7);
  assert.equal(week.length, 4);
  assert.deepEqual(week.map((x) => x.start.getDay()), [1, 1, 2, 0]);
  assert.equal(week[0].start.getHours(), 7);
  assert.equal(o.todaySessions(sessions, now).length, 2);
  assert.equal(o.upcomingSessions(sessions, now, 1).length, 2);
});

test("sessionsByWeekday starts on Monday and keeps empty days", () => {
  const grouped = o.sessionsByWeekday([mk(0), mk(3, "10:00"), mk(3, "08:00")]);
  assert.equal(grouped.length, 7);
  assert.equal(grouped[0].weekday, 1);
  assert.equal(grouped[6].weekday, 0);
  assert.deepEqual(grouped[2].items.map((i) => i.startTime), ["08:00", "10:00"]);
  assert.equal(grouped[0].items.length, 0);
});

test("upcomingExams hides finished exams and sorts by start", () => {
  const exams = [
    { id: "a", startsAt: new Date(now.getTime() + 5 * 86400000).toISOString(), durationMinutes: 60 },
    { id: "b", startsAt: new Date(now.getTime() - 3 * 3600000).toISOString(), durationMinutes: 60 },
    { id: "c", startsAt: new Date(now.getTime() + 86400000).toISOString(), durationMinutes: 60 },
    { id: "d", startsAt: new Date(now.getTime() + 90 * 86400000).toISOString(), durationMinutes: 60 },
  ];
  assert.deepEqual(o.upcomingExams(exams, now).map((e) => e.id), ["c", "a"]);
});

test("work helpers filter, count, rank deadlines and build a gradebook", () => {
  const rows = [
    work({ exerciseId: "1", status: "todo", dueAt: "2026-10-15T00:00:00.000Z" }),
    work({ exerciseId: "2", status: "todo", dueAt: "2026-10-13T00:00:00.000Z" }),
    work({ exerciseId: "3", status: "todo", dueAt: "2026-12-01T00:00:00.000Z" }),
    work({ exerciseId: "4", status: "graded", score: 8, dueAt: "2026-10-01T00:00:00.000Z" }),
    work({ exerciseId: "5", status: "graded", score: 9, dueAt: "2026-10-05T00:00:00.000Z" }),
    work({ exerciseId: "6", status: "graded", score: 5, classId: "c2", className: "PRM", dueAt: "2026-10-02T00:00:00.000Z" }),
    work({ exerciseId: "7", status: "overdue", dueAt: "2026-10-03T00:00:00.000Z" }),
  ];
  assert.deepEqual(o.filterWork(rows, "todo").map((r) => r.exerciseId), ["2", "1", "3"]);
  assert.equal(o.filterWork(rows, "all").length, 7);
  const counts = o.countWork(rows);
  assert.equal(counts.all, 7);
  assert.equal(counts.todo, 3);
  assert.equal(counts.graded, 3);
  assert.deepEqual(o.dueSoon(rows, now).map((r) => r.exerciseId), ["2", "1"]);
  assert.equal(o.gradedWork(rows).length, 3);
  const book = o.gradebook(rows);
  const mma = book.find((g) => g.classId === "c1");
  assert.equal(mma.average, 8.5);
  assert.equal(book.find((g) => g.classId === "c2").average, 5);
});

test("gradebook lists only work that already has a score", () => {
  const book = o.gradebook([
    work({}),
    work({ exerciseId: "blank", status: "graded", score: null }),
    work({ exerciseId: "scored", status: "graded", score: 7, dueAt: "2026-10-02T00:00:00.000Z" }),
  ]);
  assert.equal(book.length, 1);
  assert.deepEqual(book[0].items.map((item) => item.exerciseId), ["scored"]);
  assert.equal(book[0].average, 7);
});

test("formatDayHeader labels today and tomorrow", () => {
  assert.equal(o.formatDayHeader(now, now), "Hôm nay");
  assert.equal(o.formatDayHeader(new Date(2026, 9, 13, 9), now), "Ngày mai");
  assert.match(o.formatDayHeader(new Date(2026, 9, 16, 9), now), /^Thứ sáu/);
});

test("schedule drafts validate time, order and future start", () => {
  const ok = s.validateSessionDraft({ weekday: 2, startTime: "07:30", endTime: "09:30", room: " A1 ", note: "" });
  assert.equal(ok.room, "A1");
  assert.throws(() => s.validateSessionDraft({ weekday: 7, startTime: "07:30", endTime: "09:30", room: "", note: "" }), /thứ/);
  assert.throws(() => s.validateSessionDraft({ weekday: 1, startTime: "7:30", endTime: "09:30", room: "", note: "" }), /HH:mm/);
  assert.throws(() => s.validateSessionDraft({ weekday: 1, startTime: "09:30", endTime: "09:30", room: "", note: "" }), /sau giờ bắt đầu/);
  const future = new Date(now.getTime() + 86400000).toISOString();
  assert.equal(s.validateExamDraft({ title: " KT ", startsAt: future, durationMinutes: 45, room: "", note: "" }, now).title, "KT");
  assert.throws(() => s.validateExamDraft({ title: "", startsAt: future, durationMinutes: 45, room: "", note: "" }, now), /Tiêu đề/);
  assert.throws(() => s.validateExamDraft({ title: "KT", startsAt: now.toISOString(), durationMinutes: 45, room: "", note: "" }, now), /tương lai/);
  assert.throws(() => s.validateExamDraft({ title: "KT", startsAt: future, durationMinutes: 0, room: "", note: "" }, now), /phút/);
});

test("localDateTimeToIso parses dd/MM/yyyy HH:mm and rejects impossible dates", () => {
  const iso = s.localDateTimeToIso("20/10/2026", "09:15");
  const local = new Date(iso);
  assert.deepEqual([local.getFullYear(), local.getMonth(), local.getDate(), local.getHours(), local.getMinutes()], [2026, 9, 20, 9, 15]);
  assert.equal(s.localDateTimeToIso("31/02/2026", "09:15"), null);
  assert.equal(s.localDateTimeToIso("2026-10-20", "09:15"), null);
  assert.equal(s.localDateTimeToIso("20/10/2026", "9:15"), null);
});

test("schedule API parses lists and sends writes with the token", async () => {
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, method: options.method, body: options.body, auth: options.headers.Authorization });
    const body = url.endsWith("/sessions") && options.method === "GET"
      ? { sessions: [{ _id: "s1", classId: "c1", weekday: 1, startTime: "07:30", endTime: "09:00" }] }
      : url.endsWith("/exams") && options.method === "GET"
        ? { exams: [{ _id: "x1", classId: "c1", title: "KT", startsAt: "2030-01-01T00:00:00.000Z", durationMinutes: 30 }] }
        : { message: "ok" };
    return new Response(JSON.stringify(body), { status: 200 });
  };
  assert.equal((await s.listSessions("t", "c1"))[0].id, "s1");
  assert.equal((await s.listExams("t", "c1"))[0].title, "KT");
  await s.deleteSession("t", "c1", "s1");
  await s.deleteExam("t", "c1", "x1");
  await s.removeMember("t", "c1", "u9");
  assert.deepEqual(calls.slice(2).map((c) => [c.method, c.url.split("/classes/")[1]]), [
    ["DELETE", "c1/sessions/s1"], ["DELETE", "c1/exams/x1"], ["DELETE", "c1/members/u9"],
  ]);
  assert.ok(calls.every((c) => c.auth === "Bearer t"));
});
