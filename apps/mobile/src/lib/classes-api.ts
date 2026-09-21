import type { AuthUser } from "./api";
import { CORE_URL } from "./config";
import { http, HttpError } from "./http";

type ClassRole = AuthUser["role"];

/** LMS-05 serializes Mongo documents with _id (see Core OpenAPI Class schema). */
interface ClassResponse {
  _id: string;
  name: string;
  code: string;
  teacherId: string;
  createdAt: string;
  updatedAt: string;
}

export type LmsClass = Omit<ClassResponse, "_id"> & { id: string };

export interface ClassMember {
  _id: string;
  classId: string;
  userId: string;
  roleInClass: ClassRole;
  createdAt: string;
  updatedAt: string;
}

export interface ClassDetail {
  class: LmsClass;
  roleInClass: ClassRole;
}

function invalidResponse(): never {
  throw new HttpError("Dữ liệu lớp học không hợp lệ", 502, "INVALID_RESPONSE");
}

function normalizeClass(raw: ClassResponse): LmsClass {
  if (!raw || [raw._id, raw.name, raw.code, raw.teacherId, raw.createdAt, raw.updatedAt]
    .some((value) => typeof value !== "string" || !value)) {
    return invalidResponse();
  }
  return {
    id: raw._id, name: raw.name, code: raw.code, teacherId: raw.teacherId,
    createdAt: raw.createdAt, updatedAt: raw.updatedAt,
  };
}

export async function listClasses(token: string, role: ClassRole, signal?: AbortSignal): Promise<LmsClass[]> {
  const path = role === "teacher" ? "teaching" : "enrolled";
  const result = await http<{ classes: ClassResponse[] }>(`${CORE_URL}/classes/${path}`, { token, signal });
  if (!Array.isArray(result?.classes)) return invalidResponse();
  return result.classes.map(normalizeClass);
}

export async function getClass(token: string, id: string, signal?: AbortSignal): Promise<ClassDetail> {
  const result = await http<{ class: ClassResponse; roleInClass: ClassRole }>(
    `${CORE_URL}/classes/${encodeURIComponent(id)}`, { token, signal }
  );
  if (!result || !["teacher", "student"].includes(result.roleInClass)) return invalidResponse();
  return { class: normalizeClass(result.class), roleInClass: result.roleInClass };
}

export async function getClassMembers(token: string, id: string, signal?: AbortSignal): Promise<ClassMember[]> {
  const result = await http<{ members: ClassMember[] }>(
    `${CORE_URL}/classes/${encodeURIComponent(id)}/members`, { token, signal }
  );
  if (!Array.isArray(result?.members) || result.members.some((member) =>
    !member || [member._id, member.classId, member.userId, member.createdAt, member.updatedAt]
      .some((value) => typeof value !== "string" || !value)
    || !["teacher", "student"].includes(member.roleInClass)
  )) return invalidResponse();
  return result.members;
}

export async function createClass(token: string, name: string): Promise<LmsClass> {
  const value = name.trim();
  if (!value || value.length > 100) {
    throw new HttpError("Tên lớp học phải có từ 1 đến 100 ký tự.", 422, "VALIDATION_ERROR");
  }
  const result = await http<{ message: string; class: ClassResponse }>(`${CORE_URL}/classes`, {
    method: "POST", token, body: { name: value },
  });
  return normalizeClass(result?.class);
}

export async function joinClass(token: string, code: string): Promise<LmsClass> {
  const value = code.trim().toUpperCase();
  if (value.length !== 6) {
    throw new HttpError("Mã lớp học phải có đúng 6 ký tự.", 422, "VALIDATION_ERROR");
  }
  const result = await http<{ message: string; class: ClassResponse; membership: ClassMember }>(
    `${CORE_URL}/classes/join`, { method: "POST", token, body: { code: value } }
  );
  return normalizeClass(result?.class);
}
