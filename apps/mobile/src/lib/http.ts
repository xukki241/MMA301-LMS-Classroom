export class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type HttpOptions = {
  method?: HttpMethod;
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Extra GET retries after the first attempt. Default 1 for GET, 0 otherwise. */
  retry?: number;
  dedupe?: boolean;
};

const inflight = new Map<string, Promise<unknown>>();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAbortError(error: unknown) {
  return error instanceof Error && (error.name === "AbortError" || error.message === "Aborted");
}

function retryableStatus(status: number) {
  return status === 429 || status >= 500;
}

function parseMessage(body: unknown, status: number) {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    if (typeof record.error === "string") return record.error;
    if (typeof record.message === "string") return record.message;
  }
  return `HTTP ${status}`;
}

async function parseBody(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

function dedupeKey(url: string, method: HttpMethod, token?: string | null) {
  return `${method}:${url}:${token ?? ""}`;
}

export async function http<T>(url: string, options: HttpOptions = {}): Promise<T> {
  const method: HttpMethod = options.method ?? "GET";
  const idempotent = method === "GET";
  const shouldDedupe = options.dedupe ?? idempotent;
  const key = dedupeKey(url, method, options.token);

  if (shouldDedupe) {
    const existing = inflight.get(key);
    if (existing) return existing as Promise<T>;
  }

  const task = runWithRetry<T>(url, options, method);
  if (shouldDedupe) {
    inflight.set(key, task);
    try {
      return await task;
    } finally {
      inflight.delete(key);
    }
  }
  return task;
}

async function runWithRetry<T>(url: string, options: HttpOptions, method: HttpMethod): Promise<T> {
  const idempotent = method === "GET";
  const retries = options.retry ?? (idempotent ? 1 : 0);
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (options.signal?.aborted) {
      throw options.signal.reason instanceof Error
        ? options.signal.reason
        : new Error("Aborted");
    }
    try {
      return await requestOnce<T>(url, options, method);
    } catch (error) {
      lastError = error;
      if (isAbortError(error)) throw error;
      if (error instanceof HttpError && !retryableStatus(error.status)) throw error;
      if (!idempotent || attempt === retries) throw error;
      await sleep(300 * 2 ** attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Request failed");
}

async function requestOnce<T>(url: string, options: HttpOptions, method: HttpMethod): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 12_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const onUserAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onUserAbort);

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...options.headers,
    };
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    if (options.token) {
      headers.Authorization = `Bearer ${options.token}`;
    }

    const res = await fetch(url, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });

    const body = await parseBody(res);
    if (!res.ok) {
      throw new HttpError(parseMessage(body, res.status), res.status);
    }
    return body as T;
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error(options.signal?.aborted ? "Aborted" : "Hết thời gian chờ máy chủ");
    }
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onUserAbort);
  }
}

export function isNotFound(error: unknown) {
  return error instanceof HttpError && error.status === 404;
}
