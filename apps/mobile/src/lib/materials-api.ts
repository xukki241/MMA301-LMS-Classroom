import { CORE_URL } from "./config";
import { http } from "./http";

export type LmsMaterial = {
  id: string;
  classId: string;
  title: string;
  description?: string;
  url: string;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function normalizeMaterial(raw: unknown): LmsMaterial {
  const obj = asRecord(raw);
  const inner = asRecord(obj?.material) ?? asRecord(obj?.data) ?? obj;
  if (!inner) throw new Error("Dữ liệu tài liệu không hợp lệ");
  const id = String(inner.id ?? inner._id ?? "");
  if (!id) throw new Error("Tài liệu thiếu id");
  return {
    id,
    classId: String(inner.classId ?? ""),
    title: String(inner.title ?? "Tài liệu"),
    description: inner.description ? String(inner.description) : undefined,
    url: String(inner.url ?? ""),
    createdBy: String(inner.createdBy ?? ""),
    createdAt: inner.createdAt ? String(inner.createdAt) : undefined,
    updatedAt: inner.updatedAt ? String(inner.updatedAt) : undefined,
  };
}

function normalizeMaterialList(raw: unknown): LmsMaterial[] {
  if (Array.isArray(raw)) return raw.map(normalizeMaterial);
  const obj = asRecord(raw);
  const list = obj?.materials ?? obj?.items ?? obj?.data;
  if (Array.isArray(list)) return list.map(normalizeMaterial);
  return [];
}

/**
 * Lấy danh sách tài liệu học tập theo ID lớp
 */
export async function listMaterials(
  token: string,
  classId: string,
  signal?: AbortSignal
): Promise<LmsMaterial[]> {
  return normalizeMaterialList(
    await http(`${CORE_URL}/classes/${classId}/materials`, { token, signal })
  );
}

/**
 * Thêm liên kết tài liệu mới (Chỉ Giáo viên)
 */
export async function createMaterial(
  token: string,
  classId: string,
  data: { title: string; description?: string; url: string }
): Promise<LmsMaterial> {
  return normalizeMaterial(
    await http(`${CORE_URL}/classes/${classId}/materials`, {
      method: "POST",
      token,
      body: data,
    })
  );
}

/**
 * Xóa tài liệu học tập (Chỉ Giáo viên)
 */
export async function deleteMaterial(
  token: string,
  classId: string,
  materialId: string
): Promise<{ success: boolean; message?: string }> {
  return http<{ success: boolean; message?: string }>(
    `${CORE_URL}/classes/${classId}/materials/${materialId}`,
    {
      method: "DELETE",
      token,
    }
  );
}
