import { CORE_URL } from "./config";
import { http } from "./http";

export type CalendarEventType = "exercise" | "task";
export type CalendarEventStatus = "pending" | "submitted" | "graded" | "completed";

export type CalendarEvent = {
  id: string;
  type: CalendarEventType;
  title: string;
  description: string;
  dueAt: string;
  classId?: string;
  className?: string;
  classCode?: string;
  exerciseId?: string;
  status: CalendarEventStatus;
  isOverdue: boolean;
  submissionId?: string;
  grade?: number;
  priority?: "low" | "medium" | "high";
  taskStatus?: string;
};

export type CalendarSummary = {
  total: number;
  exercises: number;
  tasks: number;
  pending: number;
  completed: number;
  overdue: number;
};

export type ListCalendarFilter = {
  from?: string;
  to?: string;
  type?: "all" | "exercise" | "task";
  status?: "all" | "pending" | "completed" | "overdue";
  classId?: string;
};

export type CalendarResponse = {
  events: CalendarEvent[];
  summary: CalendarSummary;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function normalizeCalendarEvent(raw: unknown): CalendarEvent {
  const obj = asRecord(raw);
  if (!obj) throw new Error("Dữ liệu sự kiện lịch không hợp lệ");
  const id = String(obj.id ?? obj._id ?? "");
  if (!id) throw new Error("Sự kiện lịch thiếu ID");

  const typeRaw = String(obj.type ?? "exercise");
  const type: CalendarEventType = typeRaw === "task" ? "task" : "exercise";

  const statusRaw = String(obj.status ?? "pending");
  const status: CalendarEventStatus = ["pending", "submitted", "graded", "completed"].includes(
    statusRaw
  )
    ? (statusRaw as CalendarEventStatus)
    : "pending";

  const priorityRaw = obj.priority ? String(obj.priority) : undefined;
  const priority: "low" | "medium" | "high" | undefined =
    priorityRaw && ["low", "medium", "high"].includes(priorityRaw)
      ? (priorityRaw as "low" | "medium" | "high")
      : undefined;

  return {
    id,
    type,
    title: String(obj.title ?? "").trim(),
    description: String(obj.description ?? "").trim(),
    dueAt: String(obj.dueAt ?? new Date().toISOString()),
    classId: obj.classId ? String(obj.classId) : undefined,
    className: obj.className ? String(obj.className) : undefined,
    classCode: obj.classCode ? String(obj.classCode) : undefined,
    exerciseId: obj.exerciseId ? String(obj.exerciseId) : undefined,
    status,
    isOverdue: Boolean(obj.isOverdue),
    submissionId: obj.submissionId ? String(obj.submissionId) : undefined,
    grade: typeof obj.grade === "number" ? obj.grade : undefined,
    priority,
    taskStatus: obj.taskStatus ? String(obj.taskStatus) : undefined,
  };
}

export async function listCalendarEvents(
  token: string,
  filter?: ListCalendarFilter,
  signal?: AbortSignal
): Promise<CalendarResponse> {
  const params = new URLSearchParams();
  if (filter?.from) params.set("from", filter.from);
  if (filter?.to) params.set("to", filter.to);
  if (filter?.type && filter.type !== "all") params.set("type", filter.type);
  if (filter?.status && filter.status !== "all") params.set("status", filter.status);
  if (filter?.classId) params.set("classId", filter.classId);

  const query = params.toString();
  const url = `${CORE_URL}/calendar/events${query ? `?${query}` : ""}`;

  const res = await http<{
    success: boolean;
    events: unknown[];
    summary: CalendarSummary;
  }>(url, {
    method: "GET",
    token,
    signal,
  });

  const rawList = Array.isArray(res.events) ? res.events : [];
  const events = rawList.map(normalizeCalendarEvent);

  const defaultSummary: CalendarSummary = {
    total: events.length,
    exercises: events.filter((e) => e.type === "exercise").length,
    tasks: events.filter((e) => e.type === "task").length,
    pending: events.filter((e) => e.status === "pending" && !e.isOverdue).length,
    completed: events.filter(
      (e) => e.status === "completed" || e.status === "graded" || e.status === "submitted"
    ).length,
    overdue: events.filter((e) => e.isOverdue).length,
  };

  return {
    events,
    summary: res.summary ?? defaultSummary,
  };
}
