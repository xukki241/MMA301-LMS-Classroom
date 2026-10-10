import mongoose from "mongoose";
import { HttpError } from "../lib/httpError.js";
import type { AuthUser } from "../middleware/requireAuth.js";
import { ClassMember, ClassModel, Task, type TaskPriority, type TaskStatus } from "../models/index.js";

export interface CreateTaskInput {
  title: string;
  description?: string;
  dueDate?: string | Date;
  priority?: TaskPriority;
  status?: TaskStatus;
  classId?: string;
  exerciseId?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  dueDate?: string | Date | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  classId?: string | null;
}

export interface ListTasksFilter {
  status?: string;
  priority?: string;
  classId?: string;
  overdue?: boolean | string;
}

export class TaskService {
  /**
   * Lấy danh sách task của user hiện tại
   */
  static async listTasks(user: AuthUser, filter: ListTasksFilter = {}) {
    const query: Record<string, unknown> = { userId: user.id };

    if (filter.status) {
      if (filter.status === "pending") {
        query.status = { $in: ["todo", "in_progress"] };
      } else if (["todo", "in_progress", "completed"].includes(filter.status)) {
        query.status = filter.status;
      }
    }

    if (filter.priority && ["low", "medium", "high"].includes(filter.priority)) {
      query.priority = filter.priority;
    }

    if (filter.classId) {
      if (!mongoose.isObjectIdOrHexString(filter.classId)) {
        throw new HttpError(400, "Định dạng ID lớp học không hợp lệ", "INVALID_CLASS_ID");
      }
      query.classId = filter.classId;
    }

    if (filter.overdue === true || filter.overdue === "true") {
      query.dueDate = { $lt: new Date() };
      query.status = { $ne: "completed" };
    }

    const tasks = await Task.find(query).sort({
      dueDate: 1,
      createdAt: -1,
    });

    return tasks;
  }

  /**
   * Lấy chi tiết 1 task theo ID (chỉ xem được task của chính mình)
   */
  static async getTaskById(user: AuthUser, taskId: string) {
    if (!mongoose.isObjectIdOrHexString(taskId)) {
      throw new HttpError(400, "Định dạng ID công việc không hợp lệ", "INVALID_TASK_ID");
    }

    const task = await Task.findById(taskId);
    if (!task) {
      throw new HttpError(404, "Không tìm thấy công việc", "TASK_NOT_FOUND");
    }

    if (task.userId !== user.id) {
      throw new HttpError(403, "Bạn không có quyền truy cập công việc này", "FORBIDDEN");
    }

    return task;
  }

  /**
   * Tạo task mới
   */
  static async createTask(user: AuthUser, data: CreateTaskInput) {
    const trimmedTitle = (data.title || "").trim();
    if (!trimmedTitle || trimmedTitle.length < 2) {
      throw new HttpError(400, "Tiêu đề công việc phải có ít nhất 2 ký tự", "INVALID_TITLE");
    }
    if (trimmedTitle.length > 200) {
      throw new HttpError(400, "Tiêu đề công việc không được vượt quá 200 ký tự", "TITLE_TOO_LONG");
    }

    let parsedDueDate: Date | undefined;
    if (data.dueDate) {
      parsedDueDate = new Date(data.dueDate);
      if (Number.isNaN(parsedDueDate.getTime())) {
        throw new HttpError(400, "Thời hạn (dueDate) không phải là ngày giờ hợp lệ", "INVALID_DUE_DATE");
      }
    }

    const priority: TaskPriority = ["low", "medium", "high"].includes(data.priority as TaskPriority)
      ? (data.priority as TaskPriority)
      : "medium";

    const status: TaskStatus = ["todo", "in_progress", "completed"].includes(data.status as TaskStatus)
      ? (data.status as TaskStatus)
      : "todo";

    // Kiểm tra lớp học nếu có gắn classId
    if (data.classId) {
      if (!mongoose.isObjectIdOrHexString(data.classId)) {
        throw new HttpError(400, "Định dạng ID lớp học không hợp lệ", "INVALID_CLASS_ID");
      }
      const cls = await ClassModel.findById(data.classId);
      if (!cls) {
        throw new HttpError(404, "Không tìm thấy lớp học", "CLASS_NOT_FOUND");
      }

      const membership = await ClassMember.findOne({ classId: data.classId, userId: user.id });
      if (!membership && cls.teacherId !== user.id) {
        throw new HttpError(403, "Bạn không phải thành viên của lớp học này", "FORBIDDEN");
      }
    }

    // Kiểm tra exerciseId nếu có
    if (data.exerciseId && !mongoose.isObjectIdOrHexString(data.exerciseId)) {
      throw new HttpError(400, "Định dạng ID bài tập không hợp lệ", "INVALID_EXERCISE_ID");
    }

    const task = await Task.create({
      userId: user.id,
      classId: data.classId ? new mongoose.Types.ObjectId(data.classId) : undefined,
      exerciseId: data.exerciseId ? new mongoose.Types.ObjectId(data.exerciseId) : undefined,
      title: trimmedTitle,
      description: (data.description || "").trim(),
      dueDate: parsedDueDate,
      priority,
      status,
    });

    return task;
  }

  /**
   * Cập nhật thông tin task
   */
  static async updateTask(user: AuthUser, taskId: string, data: UpdateTaskInput) {
    const task = await this.getTaskById(user, taskId);

    if (data.title !== undefined) {
      const trimmedTitle = data.title.trim();
      if (!trimmedTitle || trimmedTitle.length < 2) {
        throw new HttpError(400, "Tiêu đề công việc phải có ít nhất 2 ký tự", "INVALID_TITLE");
      }
      if (trimmedTitle.length > 200) {
        throw new HttpError(400, "Tiêu đề công việc không được vượt quá 200 ký tự", "TITLE_TOO_LONG");
      }
      task.title = trimmedTitle;
    }

    if (data.description !== undefined) {
      task.description = data.description.trim();
    }

    if (data.dueDate !== undefined) {
      if (data.dueDate === null || data.dueDate === "") {
        task.dueDate = undefined;
      } else {
        const parsedDueDate = new Date(data.dueDate);
        if (Number.isNaN(parsedDueDate.getTime())) {
          throw new HttpError(400, "Thời hạn (dueDate) không phải là ngày giờ hợp lệ", "INVALID_DUE_DATE");
        }
        task.dueDate = parsedDueDate;
      }
    }

    if (data.priority !== undefined) {
      if (!["low", "medium", "high"].includes(data.priority)) {
        throw new HttpError(400, "Độ ưu tiên phải là low, medium hoặc high", "INVALID_PRIORITY");
      }
      task.priority = data.priority;
    }

    if (data.status !== undefined) {
      if (!["todo", "in_progress", "completed"].includes(data.status)) {
        throw new HttpError(400, "Trạng thái phải là todo, in_progress hoặc completed", "INVALID_STATUS");
      }
      task.status = data.status;
    }

    if (data.classId !== undefined) {
      if (data.classId === null || data.classId === "") {
        task.classId = undefined;
      } else {
        if (!mongoose.isObjectIdOrHexString(data.classId)) {
          throw new HttpError(400, "Định dạng ID lớp học không hợp lệ", "INVALID_CLASS_ID");
        }
        const cls = await ClassModel.findById(data.classId);
        if (!cls) {
          throw new HttpError(404, "Không tìm thấy lớp học", "CLASS_NOT_FOUND");
        }
        const membership = await ClassMember.findOne({ classId: data.classId, userId: user.id });
        if (!membership && cls.teacherId !== user.id) {
          throw new HttpError(403, "Bạn không phải thành viên của lớp học này", "FORBIDDEN");
        }
        task.classId = new mongoose.Types.ObjectId(data.classId);
      }
    }

    await task.save();
    return task;
  }

  /**
   * Đổi nhanh trạng thái hoàn thành (todo <-> completed)
   */
  static async toggleTaskStatus(user: AuthUser, taskId: string) {
    const task = await this.getTaskById(user, taskId);
    task.status = task.status === "completed" ? "todo" : "completed";
    await task.save();
    return task;
  }

  /**
   * Xóa task
   */
  static async deleteTask(user: AuthUser, taskId: string) {
    const task = await this.getTaskById(user, taskId);
    await task.deleteOne();
    return {
      success: true,
      message: "Đã xóa công việc thành công",
    };
  }
}
