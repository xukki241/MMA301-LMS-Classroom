import { ClassMember } from "../models/index.js";

/** Map userId → displayName đã lưu trên ClassMember (snapshot từ JWT). */
export async function authorNameByUserId(classId: string, userIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const members = await ClassMember.find({ classId, userId: { $in: unique } })
    .select("userId displayName")
    .lean();
  const map = new Map<string, string>();
  for (const member of members) {
    const name = String(member.displayName ?? "").trim();
    if (name) map.set(String(member.userId), name);
  }
  return map;
}

export function withAuthorDisplayName<T extends { authorId?: string; toObject?: () => Record<string, unknown> }>(
  doc: T,
  names: Map<string, string>,
): Record<string, unknown> {
  const raw = typeof doc.toObject === "function" ? doc.toObject() : ({ ...doc } as Record<string, unknown>);
  const authorId = String(raw.authorId ?? "");
  return {
    ...raw,
    authorDisplayName: names.get(authorId) || "Thành viên lớp",
  };
}
