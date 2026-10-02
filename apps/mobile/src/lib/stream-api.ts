import { CORE_URL } from "./config";
import { http, HttpError } from "./http";

export const POST_MAX_LENGTH = 2000;
export const COMMENT_MAX_LENGTH = 1000;
export type StreamPost = { id: string; classId: string; authorId: string; content: string; createdAt: string };
export type StreamComment = { id: string; postId: string; authorId: string; content: string; createdAt: string };

function invalidResponse(): never {
  throw new HttpError("Dữ liệu bảng tin không hợp lệ.", 502, "INVALID_RESPONSE");
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalidResponse();
  return value as Record<string, unknown>;
}
function requiredString(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return invalidResponse();
  return value;
}
function entry(value: unknown) {
  const raw = record(value);
  const createdAt = requiredString(raw.createdAt);
  if (!Number.isFinite(Date.parse(createdAt)) || raw.isDeleted === true) return invalidResponse();
  return {
    id: requiredString(raw._id), authorId: requiredString(raw.authorId),
    content: requiredString(raw.content), createdAt,
  };
}
function parsePost(value: unknown, classId: string): StreamPost {
  const raw = record(value);
  if (raw.classId !== classId) return invalidResponse();
  return { ...entry(raw), classId };
}
function parseComment(value: unknown, postId: string): StreamComment {
  const raw = record(value);
  if (raw.postId !== postId) return invalidResponse();
  return { ...entry(raw), postId };
}
function list<T extends { id: string }>(value: unknown, parse: (item: unknown) => T): T[] {
  if (!Array.isArray(value)) return invalidResponse();
  const result = value.map(parse);
  if (new Set(result.map(item => item.id)).size !== result.length) return invalidResponse();
  return result;
}
export function validateStreamContent(content: string, maxLength: number): string {
  const trimmed = content.trim();
  if (!trimmed || trimmed.length > maxLength) {
    throw new HttpError("Nội dung trống hoặc vượt quá giới hạn ký tự.", 422, "VALIDATION_ERROR");
  }
  return trimmed;
}
const postsUrl = (classId: string) => `${CORE_URL}/classes/${encodeURIComponent(classId)}/posts`;
const commentsUrl = (classId: string, postId: string) => `${postsUrl(classId)}/${encodeURIComponent(postId)}/comments`;

export async function listPosts(token: string, classId: string, signal?: AbortSignal): Promise<StreamPost[]> {
  const raw = record(await http<unknown>(postsUrl(classId), { token, signal }));
  return list(raw.posts, item => parsePost(item, classId));
}
export async function createPost(token: string, classId: string, content: string): Promise<StreamPost> {
  const body = { content: validateStreamContent(content, POST_MAX_LENGTH) };
  const raw = record(await http<unknown>(postsUrl(classId), { method: "POST", token, body }));
  return parsePost(raw.post, classId);
}
export async function listComments(token: string, classId: string, postId: string, signal?: AbortSignal): Promise<StreamComment[]> {
  const raw = record(await http<unknown>(commentsUrl(classId, postId), { token, signal }));
  return list(raw.comments, item => parseComment(item, postId));
}
export async function createComment(token: string, classId: string, postId: string, content: string): Promise<StreamComment> {
  const body = { content: validateStreamContent(content, COMMENT_MAX_LENGTH) };
  const raw = record(await http<unknown>(commentsUrl(classId, postId), { method: "POST", token, body }));
  return parseComment(raw.comment, postId);
}
