import { HttpError } from "./http";

type Storage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<unknown> };
type Validator<T> = (value: unknown) => value is T;

export const OFFLINE_CACHE_PREFIX = "lms23:";

export const classCacheKey = (userId: string, role: string) => `${OFFLINE_CACHE_PREFIX}classes:${encodeURIComponent(userId)}:${role}`;
export const postCacheKey = (userId: string, classId: string) =>
  `${OFFLINE_CACHE_PREFIX}posts:${encodeURIComponent(userId)}:${encodeURIComponent(classId)}`;

export function createOfflineCache(storage: Storage) {
  return {
    async read<T>(key: string, validate: Validator<T>): Promise<T | null> {
      try {
        const raw = await storage.getItem(key);
        if (raw === null) return null;
        const value: unknown = JSON.parse(raw);
        return validate(value) ? value : null;
      } catch {
        return null;
      }
    },
    async write<T>(key: string, value: T): Promise<void> {
      try { await storage.setItem(key, JSON.stringify(value)); } catch { /* Storage is optional for online reads. */ }
    },
  };
}

export async function readThroughCache<T>(
  fetchData: () => Promise<T>, cache: ReturnType<typeof createOfflineCache>, key: string,
  validate: Validator<T>, offline: boolean,
): Promise<T> {
  if (offline) {
    const cached = await cache.read(key, validate);
    if (cached !== null) return cached;
    throw new HttpError("Không có kết nối mạng và chưa có dữ liệu đã lưu.", 0, "OFFLINE_NO_CACHE");
  }
  try {
    const value = await fetchData();
    await cache.write(key, value);
    return value;
  } catch (error) {
    if (error instanceof HttpError && error.code === "NETWORK_ERROR") {
      const cached = await cache.read(key, validate);
      if (cached !== null) return cached;
    }
    throw error;
  }
}
