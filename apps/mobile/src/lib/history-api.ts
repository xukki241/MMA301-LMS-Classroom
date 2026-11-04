import { CORE_URL } from "./config";
import { http, HttpError } from "./http";

export type PaymentHistoryItem = {
  id: string;
  classId: string;
  className: string;
  materialId: string;
  materialTitle: string;
  studentId: string;
  amount: number;
  provider: string;
  transactionRef: string;
  status: "pending" | "success" | "failed";
  createdAt: string;
  updatedAt: string;
};

export type SubmissionHistoryItem = {
  id: string;
  exerciseId: string;
  exerciseTitle: string;
  classId: string;
  className: string;
  studentId: string;
  content: string;
  url: string;
  submittedAt: string;
  dueAt: string;
  score: number | null;
  feedback: string;
  status: "submitted" | "graded";
};

const invalid = (): never => {
  throw new HttpError("Dữ liệu lịch sử không hợp lệ.", 502, "INVALID_RESPONSE");
};

function rec(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
  return value as Record<string, unknown>;
}

function str(value: unknown): string {
  if (typeof value !== "string") return invalid();
  return value;
}

function optStr(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : invalid();
}

function date(value: unknown): string {
  const text = str(value);
  if (!Number.isFinite(Date.parse(text))) return invalid();
  return text;
}

export function parsePayments(value: unknown): PaymentHistoryItem[] {
  const raw = rec(value);
  const list = raw.payments;
  if (!Array.isArray(list)) return invalid();
  return list.map((item) => {
    const row = rec(item);
    const status = str(row.status);
    if (status !== "pending" && status !== "success" && status !== "failed") return invalid();
    return {
      id: str(row.id),
      classId: str(row.classId),
      className: optStr(row.className),
      materialId: str(row.materialId),
      materialTitle: str(row.materialTitle),
      studentId: optStr(row.studentId),
      amount: num(row.amount),
      provider: optStr(row.provider),
      transactionRef: str(row.transactionRef),
      status,
      createdAt: date(row.createdAt),
      updatedAt: date(row.updatedAt),
    };
  });
}

export function parseSubmissions(value: unknown): SubmissionHistoryItem[] {
  const raw = rec(value);
  const list = raw.submissions;
  if (!Array.isArray(list)) return invalid();
  return list.map((item) => {
    const row = rec(item);
    const status = str(row.status);
    if (status !== "submitted" && status !== "graded") return invalid();
    return {
      id: str(row.id),
      exerciseId: str(row.exerciseId),
      exerciseTitle: str(row.exerciseTitle),
      classId: optStr(row.classId),
      className: optStr(row.className),
      studentId: optStr(row.studentId),
      content: optStr(row.content),
      url: optStr(row.url),
      submittedAt: date(row.submittedAt),
      dueAt: optStr(row.dueAt),
      score: typeof row.score === "number" ? row.score : null,
      feedback: optStr(row.feedback),
      status,
    };
  });
}

export async function fetchMyPayments(token: string, signal?: AbortSignal): Promise<PaymentHistoryItem[]> {
  return parsePayments(await http<unknown>(`${CORE_URL}/me/payments`, { token, signal }));
}

export async function fetchMySubmissions(token: string, signal?: AbortSignal): Promise<SubmissionHistoryItem[]> {
  return parseSubmissions(await http<unknown>(`${CORE_URL}/me/submissions`, { token, signal }));
}

export const PAYMENT_STATUS_LABEL: Record<PaymentHistoryItem["status"], string> = {
  pending: "Đang chờ",
  success: "Thành công",
  failed: "Thất bại",
};

export const SUBMISSION_HISTORY_LABEL: Record<SubmissionHistoryItem["status"], string> = {
  submitted: "Đã nộp",
  graded: "Đã có điểm",
};

export function shortUserId(id: string): string {
  if (!id) return "—";
  return id.length <= 8 ? id : `…${id.slice(-6)}`;
}
