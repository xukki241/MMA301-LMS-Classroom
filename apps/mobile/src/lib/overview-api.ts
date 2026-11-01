import { CORE_URL } from "./config";
import { http, HttpError } from "./http";

export type Role = "teacher" | "student";
export type StudentStatus = "todo" | "submitted" | "graded" | "overdue";
export type TeacherStatus = "open" | "needs_grading" | "done";

export type OverviewClass = { id: string; name: string; code: string };

export type OverviewSession = {
  id: string;
  classId: string;
  className: string;
  weekday: number;
  startTime: string;
  endTime: string;
  room: string;
  note: string;
};

export type OverviewExam = {
  id: string;
  classId: string;
  className: string;
  title: string;
  startsAt: string;
  durationMinutes: number;
  room: string;
  note: string;
};

export type OverviewWork = {
  exerciseId: string;
  classId: string;
  className: string;
  title: string;
  dueAt: string;
  status: StudentStatus | TeacherStatus;
  score: number | null;
  feedback: string;
  submissionCount: number;
  gradedCount: number;
};

export type Overview = {
  role: Role;
  classes: OverviewClass[];
  sessions: OverviewSession[];
  exams: OverviewExam[];
  work: OverviewWork[];
};

const invalid = (): never => {
  throw new HttpError("Dữ liệu tổng quan không hợp lệ.", 502, "INVALID_RESPONSE");
};

function rec(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
  return value as Record<string, unknown>;
}
function str(value: unknown): string {
  if (typeof value !== "string" || !value) return invalid();
  return value;
}
const optStr = (value: unknown) => (typeof value === "string" ? value : "");
function arr(value: unknown): unknown[] {
  if (!Array.isArray(value)) return invalid();
  return value;
}
function date(value: unknown): string {
  const text = str(value);
  if (!Number.isFinite(Date.parse(text))) return invalid();
  return text;
}

export function parseOverview(value: unknown): Overview {
  const raw = rec(value);
  const role = raw.role;
  if (role !== "teacher" && role !== "student") return invalid();
  return {
    role,
    classes: arr(raw.classes).map((item) => {
      const c = rec(item);
      return { id: str(c.id), name: str(c.name), code: optStr(c.code) };
    }),
    sessions: arr(raw.sessions).map((item) => {
      const s = rec(item);
      const weekday = s.weekday;
      if (typeof weekday !== "number" || weekday < 0 || weekday > 6) return invalid();
      return {
        id: str(s._id), classId: str(s.classId), className: optStr(s.className), weekday,
        startTime: str(s.startTime), endTime: str(s.endTime), room: optStr(s.room), note: optStr(s.note),
      };
    }),
    exams: arr(raw.exams).map((item) => {
      const e = rec(item);
      return {
        id: str(e._id), classId: str(e.classId), className: optStr(e.className), title: str(e.title),
        startsAt: date(e.startsAt),
        durationMinutes: typeof e.durationMinutes === "number" ? e.durationMinutes : 0,
        room: optStr(e.room), note: optStr(e.note),
      };
    }),
    work: arr(raw.work).map((item) => {
      const w = rec(item);
      return {
        exerciseId: str(w.exerciseId), classId: str(w.classId), className: optStr(w.className),
        title: str(w.title), dueAt: date(w.dueAt), status: str(w.status) as OverviewWork["status"],
        score: typeof w.score === "number" ? w.score : null,
        feedback: optStr(w.feedback),
        submissionCount: typeof w.submissionCount === "number" ? w.submissionCount : 0,
        gradedCount: typeof w.gradedCount === "number" ? w.gradedCount : 0,
      };
    }),
  };
}

export async function fetchOverview(token: string, signal?: AbortSignal): Promise<Overview> {
  return parseOverview(await http<unknown>(`${CORE_URL}/me/overview`, { token, signal }));
}

/* ---------- Hàm thuần dùng cho Trang chủ / Lịch / Việc ---------- */

export const WEEKDAY_LABELS = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"] as const;
/** Thứ tự hiển thị trong tuần: bắt đầu từ Thứ hai. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

const DAY_MS = 24 * 3600 * 1000;

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function sameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export type SessionOccurrence = { session: OverviewSession; start: Date; end: Date };

function atTime(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
}

/** Các buổi học rơi vào `days` ngày kể từ hôm nay (kể cả hôm nay), sắp theo thời gian. */
export function upcomingSessions(sessions: OverviewSession[], now: Date, days: number): SessionOccurrence[] {
  const today = startOfDay(now);
  const result: SessionOccurrence[] = [];
  for (let offset = 0; offset < days; offset += 1) {
    // Dựng ngày bằng thành phần y/m/d để không lệch khi đổi giờ mùa hè.
    const target = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    for (const session of sessions) {
      if (session.weekday !== target.getDay()) continue;
      result.push({ session, start: atTime(target, session.startTime), end: atTime(target, session.endTime) });
    }
  }
  return result.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function todaySessions(sessions: OverviewSession[], now: Date): SessionOccurrence[] {
  return upcomingSessions(sessions, now, 1);
}

export function upcomingExams(exams: OverviewExam[], now: Date, days = 30): OverviewExam[] {
  const limit = now.getTime() + days * DAY_MS;
  return exams
    .filter((exam) => {
      const start = Date.parse(exam.startsAt);
      return start + exam.durationMinutes * 60_000 >= now.getTime() && start <= limit;
    })
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}

export function sessionsByWeekday(sessions: OverviewSession[]): { weekday: number; items: OverviewSession[] }[] {
  return WEEK_ORDER.map((weekday) => ({
    weekday,
    items: sessions.filter((s) => s.weekday === weekday).sort((a, b) => a.startTime.localeCompare(b.startTime)),
  }));
}

export type WorkFilter = "all" | "todo" | "submitted" | "graded" | "overdue" | "needs_grading" | "open" | "done";

export function filterWork(work: OverviewWork[], filter: WorkFilter): OverviewWork[] {
  const rows = filter === "all" ? work : work.filter((item) => item.status === filter);
  return [...rows].sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
}

export function countWork(work: OverviewWork[]): Record<string, number> {
  const counts: Record<string, number> = { all: work.length };
  for (const item of work) counts[item.status] = (counts[item.status] ?? 0) + 1;
  return counts;
}

/** Bài học sinh cần nộp sớm nhất (chưa nộp, còn hạn). */
export function dueSoon(work: OverviewWork[], now: Date, days = 7): OverviewWork[] {
  const limit = now.getTime() + days * DAY_MS;
  return work
    .filter((item) => item.status === "todo" && Date.parse(item.dueAt) >= now.getTime() && Date.parse(item.dueAt) <= limit)
    .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
}

export function gradedWork(work: OverviewWork[]): OverviewWork[] {
  return work.filter((item) => item.status === "graded" && item.score !== null);
}

export type ClassGrades = { classId: string; className: string; items: OverviewWork[]; average: number | null };

export function gradebook(work: OverviewWork[]): ClassGrades[] {
  const groups = new Map<string, ClassGrades>();
  for (const item of work) {
    if (item.score == null) continue;
    const group = groups.get(item.classId) ?? { classId: item.classId, className: item.className, items: [], average: null };
    group.items.push(item);
    groups.set(item.classId, group);
  }
  return [...groups.values()].map((group) => {
    const scores = group.items.map((i) => i.score).filter((s): s is number => s !== null);
    const average = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
    return { ...group, items: group.items.sort((a, b) => Date.parse(b.dueAt) - Date.parse(a.dueAt)), average };
  });
}

export function formatTimeRange(session: Pick<OverviewSession, "startTime" | "endTime">): string {
  return `${session.startTime} – ${session.endTime}`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" });
}

export function formatDayHeader(date: Date, now: Date): string {
  if (sameDay(date, now)) return "Hôm nay";
  if (sameDay(date, new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))) return "Ngày mai";
  return `${WEEKDAY_LABELS[date.getDay()]}, ${date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}`;
}

export const STUDENT_STATUS_LABEL: Record<StudentStatus, string> = {
  todo: "Cần nộp",
  submitted: "Đã nộp",
  graded: "Đã có điểm",
  overdue: "Quá hạn",
};

export const TEACHER_STATUS_LABEL: Record<TeacherStatus, string> = {
  open: "Đang mở",
  needs_grading: "Cần chấm",
  done: "Đã chấm xong",
};
