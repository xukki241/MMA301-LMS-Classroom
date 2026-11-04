import { CORE_URL } from "./config";
import { http, HttpError } from "./http";

export type ClassFileItem = {
  id: string;
  classId: string;
  uploadedBy: string;
  uploaderDisplayName: string;
  purpose: "material" | "exercise" | "submission" | "other";
  publicId: string;
  url: string;
  resourceType: string;
  format: string;
  bytes: number;
  originalFilename: string;
  mimeType: string;
  createdAt?: string;
};

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError("Phản hồi file không hợp lệ.", 502, "INVALID_RESPONSE");
  }
  return value as Record<string, unknown>;
}

export async function getCloudinaryStatus(token: string): Promise<{ configured: boolean }> {
  const raw = record(await http<unknown>(`${CORE_URL}/uploads/cloudinary/status`, { token }));
  return { configured: Boolean(raw.configured) };
}

export async function listClassFiles(token: string, classId: string, signal?: AbortSignal): Promise<ClassFileItem[]> {
  const raw = record(
    await http<unknown>(`${CORE_URL}/classes/${encodeURIComponent(classId)}/files`, { token, signal }),
  );
  if (!Array.isArray(raw.files)) throw new HttpError("Danh sách file không hợp lệ.", 502, "INVALID_RESPONSE");
  return raw.files.map((item) => {
    const row = record(item);
    return {
      id: String(row.id ?? row._id),
      classId: String(row.classId),
      uploadedBy: String(row.uploadedBy ?? ""),
      uploaderDisplayName: String(row.uploaderDisplayName ?? ""),
      purpose: (row.purpose as ClassFileItem["purpose"]) || "other",
      publicId: String(row.publicId ?? ""),
      url: String(row.url ?? row.secureUrl ?? ""),
      resourceType: String(row.resourceType ?? "raw"),
      format: String(row.format ?? ""),
      bytes: Number(row.bytes ?? 0),
      originalFilename: String(row.originalFilename ?? "file"),
      mimeType: String(row.mimeType ?? ""),
      createdAt: typeof row.createdAt === "string" ? row.createdAt : undefined,
    };
  });
}

export async function uploadClassFile(
  token: string,
  classId: string,
  input: {
    dataUri: string;
    fileName?: string;
    mimeType?: string;
    purpose?: ClassFileItem["purpose"];
  },
): Promise<{ id: string; url: string; originalFilename: string; bytes: number }> {
  const raw = record(
    await http<unknown>(`${CORE_URL}/classes/${encodeURIComponent(classId)}/files`, {
      method: "POST",
      token,
      body: input,
      timeoutMs: 120_000,
    }),
  );
  const file = record(raw.file);
  return {
    id: String(file.id),
    url: String(file.url),
    originalFilename: String(file.originalFilename ?? input.fileName ?? "file"),
    bytes: Number(file.bytes ?? 0),
  };
}

export async function deleteClassFile(token: string, classId: string, fileId: string): Promise<void> {
  await http<unknown>(
    `${CORE_URL}/classes/${encodeURIComponent(classId)}/files/${encodeURIComponent(fileId)}`,
    { method: "DELETE", token },
  );
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
