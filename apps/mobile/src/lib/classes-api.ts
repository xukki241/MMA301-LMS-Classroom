import { CORE_URL } from "./config";
import { http } from "./http";

export type LmsClass = {
  id: string;
  name: string;
  code: string;
  teacherId: string;
  createdAt?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function normalizeClass(raw: unknown): LmsClass {
  const obj = asRecord(raw);
  const inner = asRecord(obj?.class) ?? asRecord(obj?.data) ?? obj;
  if (!inner) throw new Error("Dữ liệu lớp không hợp lệ");
  const id = String(inner.id ?? inner._id ?? "");
  if (!id) throw new Error("Lớp thiếu id");
  return {
    id,
    name: String(inner.name ?? "Lớp học"),
    code: String(inner.code ?? ""),
    teacherId: String(inner.teacherId ?? inner.teacher_id ?? ""),
    createdAt: inner.createdAt ? String(inner.createdAt) : undefined,
  };
}

function normalizeClassList(raw: unknown): LmsClass[] {
  if (Array.isArray(raw)) return raw.map(normalizeClass);
  const obj = asRecord(raw);
  const list = obj?.classes ?? obj?.items ?? obj?.data;
  if (Array.isArray(list)) return list.map(normalizeClass);
  return [];
}

export async function listClasses(token: string, signal?: AbortSignal): Promise<LmsClass[]> {
  return normalizeClassList(await http(`${CORE_URL}/classes`, { token, signal }));
}

export async function getClass(token: string, id: string, signal?: AbortSignal): Promise<LmsClass> {
  return normalizeClass(await http(`${CORE_URL}/classes/${id}`, { token, signal }));
}

export async function createClass(token: string, name: string): Promise<LmsClass> {
  return normalizeClass(
    await http(`${CORE_URL}/classes`, {
      method: "POST",
      token,
      body: { name },
    })
  );
}

export async function joinClass(token: string, code: string): Promise<LmsClass> {
  return normalizeClass(
    await http(`${CORE_URL}/classes/join`, {
      method: "POST",
      token,
      body: { code },
    })
  );
}
