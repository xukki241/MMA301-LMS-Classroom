import { CORE_URL } from "./config";
import { http } from "./http";

export type LmsAssignment = {
  id: string;
  classId: string;
  title: string;
  description?: string;
  dueDate?: string;
  maxScore: number;
  createdBy: string;
  createdAt?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function normalizeAssignment(raw: unknown): LmsAssignment {
  const obj = asRecord(raw);
  const inner = asRecord(obj?.assignment) ?? asRecord(obj?.data) ?? obj;
  if (!inner) throw new Error("Dữ liệu bài tập không hợp lệ");
  const id = String(inner.id ?? inner._id ?? "");
  if (!id) throw new Error("Bài tập thiếu id");
  return {
    id,
    classId: String(inner.classId ?? ""),
    title: String(inner.title ?? "Bài tập"),
    description: inner.description ? String(inner.description) : undefined,
    dueDate: inner.dueDate ? String(inner.dueDate) : undefined,
    maxScore: Number(inner.maxScore ?? 100),
    createdBy: String(inner.createdBy ?? ""),
    createdAt: inner.createdAt ? String(inner.createdAt) : undefined,
  };
}

function normalizeAssignmentList(raw: unknown): LmsAssignment[] {
  if (Array.isArray(raw)) return raw.map(normalizeAssignment);
  const obj = asRecord(raw);
  const list = obj?.assignments ?? obj?.items ?? obj?.data;
  if (Array.isArray(list)) return list.map(normalizeAssignment);
  return [];
}

export async function listAssignments(
  token: string,
  classId: string,
  signal?: AbortSignal
): Promise<LmsAssignment[]> {
  return normalizeAssignmentList(
    await http(`${CORE_URL}/classes/${classId}/assignments`, { token, signal })
  );
}

export async function createAssignment(
  token: string,
  classId: string,
  data: { title: string; description?: string; dueDate?: string; maxScore?: number }
): Promise<LmsAssignment> {
  return normalizeAssignment(
    await http(`${CORE_URL}/classes/${classId}/assignments`, {
      method: "POST",
      token,
      body: data,
    })
  );
}

export async function deleteAssignment(
  token: string,
  classId: string,
  assignmentId: string
): Promise<{ success: boolean; message?: string }> {
  return http<{ success: boolean; message?: string }>(
    `${CORE_URL}/classes/${classId}/assignments/${assignmentId}`,
    { method: "DELETE", token }
  );
}
