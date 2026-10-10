import { CORE_URL } from "./config";
import { http } from "./http";

export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "todo" | "in_progress" | "completed";

export type LmsTask = {
  id: string;
  userId: string;
  classId?: string;
  exerciseId?: string;
  title: string;
  description: string;
  dueDate?: string;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateTaskPayload = {
  title: string;
  description?: string;
  dueDate?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  classId?: string;
  exerciseId?: string;
};

export type UpdateTaskPayload = {
  title?: string;
  description?: string;
  dueDate?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  classId?: string | null;
};

export type ListTasksFilter = {
  status?: string;
  priority?: string;
  classId?: string;
  overdue?: boolean | string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function normalizeTask(raw: unknown): LmsTask {
  const obj = asRecord(raw);
  const inner = asRecord(obj?.task) ?? asRecord(obj?.data) ?? obj;
  if (!inner) throw new Error("Dữ liệu công việc không hợp lệ");
  const id = String(inner.id ?? inner._id ?? "");
  if (!id) throw new Error("Công việc thiếu id");

  const priorityRaw = String(inner.priority ?? "medium");
  const priority: TaskPriority = ["low", "medium", "high"].includes(priorityRaw)
    ? (priorityRaw as TaskPriority)
    : "medium";

  const statusRaw = String(inner.status ?? "todo");
  const status: TaskStatus = ["todo", "in_progress", "completed"].includes(statusRaw)
    ? (statusRaw as TaskStatus)
    : "todo";

  return {
    id,
    userId: String(inner.userId ?? ""),
    classId: inner.classId ? String(inner.classId) : undefined,
    exerciseId: inner.exerciseId ? String(inner.exerciseId) : undefined,
    title: String(inner.title ?? "Công việc"),
    description: String(inner.description ?? ""),
    dueDate: inner.dueDate ? String(inner.dueDate) : undefined,
    priority,
    status,
    createdAt: inner.createdAt ? String(inner.createdAt) : undefined,
    updatedAt: inner.updatedAt ? String(inner.updatedAt) : undefined,
  };
}

export function normalizeTaskList(raw: unknown): LmsTask[] {
  if (Array.isArray(raw)) return raw.map(normalizeTask);
  const obj = asRecord(raw);
  const list = obj?.tasks ?? obj?.items ?? obj?.data;
  if (Array.isArray(list)) return list.map(normalizeTask);
  return [];
}

/**
 * Lấy danh sách công việc cá nhân
 */
export async function listTasks(
  token: string,
  filter?: ListTasksFilter,
  signal?: AbortSignal
): Promise<LmsTask[]> {
  const params = new URLSearchParams();
  if (filter?.status) params.set("status", filter.status);
  if (filter?.priority) params.set("priority", filter.priority);
  if (filter?.classId) params.set("classId", filter.classId);
  if (filter?.overdue) params.set("overdue", String(filter.overdue));

  const query = params.toString();
  const url = `${CORE_URL}/tasks${query ? `?${query}` : ""}`;

  return normalizeTaskList(await http(url, { token, signal }));
}

/**
 * Lấy chi tiết một công việc
 */
export async function getTask(
  token: string,
  taskId: string,
  signal?: AbortSignal
): Promise<LmsTask> {
  return normalizeTask(await http(`${CORE_URL}/tasks/${taskId}`, { token, signal }));
}

/**
 * Tạo công việc mới
 */
export async function createTask(
  token: string,
  payload: CreateTaskPayload
): Promise<LmsTask> {
  return normalizeTask(
    await http(`${CORE_URL}/tasks`, {
      method: "POST",
      token,
      body: payload,
    })
  );
}

/**
 * Cập nhật công việc
 */
export async function updateTask(
  token: string,
  taskId: string,
  payload: UpdateTaskPayload
): Promise<LmsTask> {
  return normalizeTask(
    await http(`${CORE_URL}/tasks/${taskId}`, {
      method: "PATCH",
      token,
      body: payload,
    })
  );
}

/**
 * Chuyển đổi trạng thái hoàn thành (todo <-> completed)
 */
export async function toggleTask(
  token: string,
  taskId: string
): Promise<LmsTask> {
  return normalizeTask(
    await http(`${CORE_URL}/tasks/${taskId}/toggle`, {
      method: "PATCH",
      token,
    })
  );
}

/**
 * Xóa công việc
 */
export async function deleteTask(
  token: string,
  taskId: string
): Promise<{ success: boolean; message?: string }> {
  return http<{ success: boolean; message?: string }>(`${CORE_URL}/tasks/${taskId}`, {
    method: "DELETE",
    token,
  });
}
