import { CORE_URL } from "./config";
import { http, HttpError } from "./http";

export type ClassSessionItem = {
  id: string;
  classId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  room: string;
  note: string;
};

export type ClassExamItem = {
  id: string;
  classId: string;
  title: string;
  startsAt: string;
  durationMinutes: number;
  room: string;
  note: string;
};

export type SessionDraft = { weekday: number; startTime: string; endTime: string; room: string; note: string };
export type ExamDraft = { title: string; startsAt: string; durationMinutes: number; room: string; note: string };

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const invalid = (): never => {
  throw new HttpError("Dữ liệu lịch không hợp lệ.", 502, "INVALID_RESPONSE");
};
const text = (value: unknown) => (typeof value === "string" ? value : "");
function need(value: unknown): string {
  if (typeof value !== "string" || !value) return invalid();
  return value;
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
  return value as Record<string, unknown>;
}

export function parseSession(value: unknown): ClassSessionItem {
  const raw = record(value);
  const weekday = raw.weekday;
  if (typeof weekday !== "number" || weekday < 0 || weekday > 6) return invalid();
  return {
    id: need(raw._id), classId: need(raw.classId), weekday,
    startTime: need(raw.startTime), endTime: need(raw.endTime), room: text(raw.room), note: text(raw.note),
  };
}

export function parseExam(value: unknown): ClassExamItem {
  const raw = record(value);
  const startsAt = need(raw.startsAt);
  if (!Number.isFinite(Date.parse(startsAt))) return invalid();
  return {
    id: need(raw._id), classId: need(raw.classId), title: need(raw.title), startsAt,
    durationMinutes: typeof raw.durationMinutes === "number" ? raw.durationMinutes : 0,
    room: text(raw.room), note: text(raw.note),
  };
}

export function validateSessionDraft(draft: SessionDraft): SessionDraft {
  if (!Number.isInteger(draft.weekday) || draft.weekday < 0 || draft.weekday > 6) {
    throw new HttpError("Chọn thứ trong tuần.", 422, "VALIDATION_ERROR");
  }
  if (!TIME_RE.test(draft.startTime) || !TIME_RE.test(draft.endTime)) {
    throw new HttpError("Giờ phải có dạng HH:mm, ví dụ 07:30.", 422, "VALIDATION_ERROR");
  }
  if (draft.endTime <= draft.startTime) {
    throw new HttpError("Giờ kết thúc phải sau giờ bắt đầu.", 422, "VALIDATION_ERROR");
  }
  return { ...draft, room: draft.room.trim().slice(0, 60), note: draft.note.trim().slice(0, 300) };
}

export function validateExamDraft(draft: ExamDraft, now = new Date()): ExamDraft {
  const title = draft.title.trim();
  if (!title || title.length > 200) {
    throw new HttpError("Tiêu đề kỳ kiểm tra cần 1–200 ký tự.", 422, "VALIDATION_ERROR");
  }
  const start = Date.parse(draft.startsAt);
  if (!Number.isFinite(start) || start <= now.getTime()) {
    throw new HttpError("Thời điểm kiểm tra phải ở tương lai.", 422, "VALIDATION_ERROR");
  }
  if (!Number.isInteger(draft.durationMinutes) || draft.durationMinutes < 1 || draft.durationMinutes > 600) {
    throw new HttpError("Thời lượng từ 1 đến 600 phút.", 422, "VALIDATION_ERROR");
  }
  return { ...draft, title, room: draft.room.trim().slice(0, 60), note: draft.note.trim().slice(0, 300) };
}

/** Chuyển "dd/MM/yyyy" + "HH:mm" (giờ địa phương) thành ISO có timezone; null nếu sai định dạng. */
export function localDateTimeToIso(dateText: string, timeText: string): string | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(dateText.trim());
  if (!match || !TIME_RE.test(timeText.trim())) return null;
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const [hour, minute] = timeText.trim().split(":").map(Number);
  const result = new Date(year, month - 1, day, hour, minute);
  if (result.getFullYear() !== year || result.getMonth() !== month - 1 || result.getDate() !== day) return null;
  return result.toISOString();
}

const base = (classId: string) => `${CORE_URL}/classes/${encodeURIComponent(classId)}`;

export async function listSessions(token: string, classId: string, signal?: AbortSignal): Promise<ClassSessionItem[]> {
  const raw = record(await http<unknown>(`${base(classId)}/sessions`, { token, signal }));
  if (!Array.isArray(raw.sessions)) return invalid();
  return raw.sessions.map(parseSession);
}

export async function createSession(token: string, classId: string, draft: SessionDraft): Promise<ClassSessionItem> {
  const body = validateSessionDraft(draft);
  const raw = record(await http<unknown>(`${base(classId)}/sessions`, { method: "POST", token, body }));
  return parseSession(raw.session);
}

export async function deleteSession(token: string, classId: string, sessionId: string): Promise<void> {
  await http<unknown>(`${base(classId)}/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE", token });
}

export async function listExams(token: string, classId: string, signal?: AbortSignal): Promise<ClassExamItem[]> {
  const raw = record(await http<unknown>(`${base(classId)}/exams`, { token, signal }));
  if (!Array.isArray(raw.exams)) return invalid();
  return raw.exams.map(parseExam);
}

export async function createExam(token: string, classId: string, draft: ExamDraft): Promise<ClassExamItem> {
  const body = validateExamDraft(draft);
  const raw = record(await http<unknown>(`${base(classId)}/exams`, { method: "POST", token, body }));
  return parseExam(raw.exam);
}

export async function deleteExam(token: string, classId: string, examId: string): Promise<void> {
  await http<unknown>(`${base(classId)}/exams/${encodeURIComponent(examId)}`, { method: "DELETE", token });
}

export async function removeMember(token: string, classId: string, userId: string): Promise<void> {
  await http<unknown>(`${base(classId)}/members/${encodeURIComponent(userId)}`, { method: "DELETE", token });
}
