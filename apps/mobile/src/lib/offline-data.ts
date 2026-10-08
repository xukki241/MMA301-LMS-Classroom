import AsyncStorage from "@react-native-async-storage/async-storage";
import { getClass, listClasses, type ClassDetail, type LmsClass } from "./classes-api";
import { listPosts, type StreamPost } from "./stream-api";
import { HttpError } from "./http";
import {
  classCacheKey,
  createOfflineCache,
  OFFLINE_CACHE_PREFIX,
  postCacheKey,
  readThroughCache,
} from "./offline-cache-core";
import { networkState } from "./network-state";

const cache = createOfflineCache(AsyncStorage);
const nonempty = (value: unknown): value is string => typeof value === "string" && value.length > 0;
const isClassList = (value: unknown): value is LmsClass[] => Array.isArray(value) && value.every(item =>
  item && typeof item === "object" &&
  [item.id, item.name, item.code, item.teacherId, item.createdAt, item.updatedAt].every(nonempty));
const isPostList = (value: unknown): value is StreamPost[] => Array.isArray(value) && value.every(item =>
  item && typeof item === "object" &&
  [item.id, item.classId, item.authorId, item.content, item.createdAt].every(nonempty));

export async function cachedClasses(token: string, userId: string, role: "teacher" | "student", signal?: AbortSignal) {
  return readThroughCache(() => listClasses(token, role, signal), cache, classCacheKey(userId, role), isClassList, networkState.isOffline());
}

export async function cachedPosts(token: string, userId: string, classId: string, signal?: AbortSignal) {
  if (!classId) throw new HttpError("Lớp học không hợp lệ.", 400);
  const key = postCacheKey(userId, classId);
  const valid = (value: unknown): value is StreamPost[] => isPostList(value) && value.every(post => post.classId === classId);
  return readThroughCache(() => listPosts(token, classId, signal), cache, key, valid, networkState.isOffline());
}

/** Removes all LMS offline cache entries (used on logout to prevent cross-user reads). */
export async function purgeOfflineCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter(key => key.startsWith(OFFLINE_CACHE_PREFIX));
    if (ours.length > 0) await AsyncStorage.multiRemove(ours);
  } catch {
    /* Best-effort; online session still uses per-user cache keys. */
  }
}

export async function cachedClassDetail(
  token: string, userId: string, role: "teacher" | "student", classId: string, signal?: AbortSignal,
): Promise<ClassDetail> {
  if (!classId) throw new HttpError("Lớp học không hợp lệ.", 400);
  const fromList = async (networkError?: HttpError) => {
    const list = await cache.read(classCacheKey(userId, role), isClassList);
    const item = list?.find(entry => entry.id === classId);
    if (!item) throw networkError ?? new HttpError("Không có kết nối mạng và chưa có dữ liệu đã lưu cho lớp này.", 0, "OFFLINE_NO_CACHE");
    return { class: item, roleInClass: item.teacherId === userId ? "teacher" as const : "student" as const };
  };
  if (networkState.isOffline()) return fromList();
  try {
    return await getClass(token, classId, signal);
  } catch (error) {
    if (error instanceof HttpError && error.code === "NETWORK_ERROR") return fromList(error);
    throw error;
  }
}
