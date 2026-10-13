import mongoose from "mongoose";
import { HttpError } from "../lib/httpError.js";
import type { AuthUser } from "../middleware/requireAuth.js";
import {
  ClassMember,
  ClassModel,
  Exercise,
  Grade,
  Submission,
  Task,
  type TaskPriority,
} from "../models/index.js";

export type CalendarEventType = "exercise" | "task";

export interface CalendarEventItem {
  id: string;
  type: CalendarEventType;
  title: string;
  description: string;
  dueAt: string; // ISO date string
  classId?: string;
  className?: string;
  classCode?: string;
  exerciseId?: string;
  status: "pending" | "submitted" | "graded" | "completed";
  isOverdue: boolean;
  submissionId?: string;
  grade?: number;
  priority?: TaskPriority;
  taskStatus?: string;
}

export interface CalendarSummary {
  total: number;
  exercises: number;
  tasks: number;
  pending: number;
  completed: number;
  overdue: number;
}

export interface ListCalendarEventsFilter {
  from?: string;
  to?: string;
  type?: "all" | "exercise" | "task";
  status?: "all" | "pending" | "completed" | "overdue";
  classId?: string;
}

export class CalendarService {
  /**
   * Lấy và tổng hợp toàn bộ sự kiện deadline (Bài tập lớp & Task cá nhân)
   */
  static async listEvents(
    user: AuthUser,
    filter: ListCalendarEventsFilter = {}
  ): Promise<{ events: CalendarEventItem[]; summary: CalendarSummary }> {
    // 1. Phân tích khoảng thời gian
    const now = new Date();
    let fromDate: Date;
    let toDate: Date;

    if (filter.from) {
      fromDate = new Date(filter.from);
      if (Number.isNaN(fromDate.getTime())) {
        throw new HttpError(400, "Thời gian bắt đầu (from) không hợp lệ", "INVALID_DATE_FROM");
      }
    } else {
      // Mặc định: 7 ngày trước hôm nay
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
    }

    if (filter.to) {
      toDate = new Date(filter.to);
      if (Number.isNaN(toDate.getTime())) {
        throw new HttpError(400, "Thời gian kết thúc (to) không hợp lệ", "INVALID_DATE_TO");
      }
    } else {
      // Mặc định: 30 ngày sau hôm nay
      toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30, 23, 59, 59, 999);
    }

    if (fromDate > toDate) {
      throw new HttpError(
        400,
        "Thời gian bắt đầu không được lớn hơn thời gian kết thúc",
        "INVALID_DATE_RANGE"
      );
    }

    // 2. Lấy danh sách lớp mà user là thành viên hoặc giáo viên sở hữu
    const classMap = new Map<string, { id: string; name: string; code: string }>();

    if (user.role === "teacher") {
      const ownedClasses = await ClassModel.find({ teacherId: user.id });
      for (const c of ownedClasses) {
        classMap.set(c._id.toString(), {
          id: c._id.toString(),
          name: c.name,
          code: c.code,
        });
      }
    }

    const memberships = await ClassMember.find({ userId: user.id });
    const memberClassIds = memberships.map((m) => m.classId);
    if (memberClassIds.length > 0) {
      const joinedClasses = await ClassModel.find({ _id: { $in: memberClassIds } });
      for (const c of joinedClasses) {
        classMap.set(c._id.toString(), {
          id: c._id.toString(),
          name: c.name,
          code: c.code,
        });
      }
    }

    const allowedClassIds = Array.from(classMap.keys());

    // Nếu có filter.classId cụ thể, kiểm tra quyền truy cập lớp đó
    let targetClassIds = allowedClassIds;
    if (filter.classId) {
      if (!mongoose.isObjectIdOrHexString(filter.classId)) {
        throw new HttpError(400, "Định dạng ID lớp học không hợp lệ", "INVALID_CLASS_ID");
      }
      if (!allowedClassIds.includes(filter.classId)) {
        throw new HttpError(403, "Bạn không có quyền truy cập lớp học này", "FORBIDDEN");
      }
      targetClassIds = [filter.classId];
    }

    const rawEvents: CalendarEventItem[] = [];

    // 3. Truy vấn Bài tập lớp (Exercises) nếu type !== "task"
    if (filter.type !== "task" && targetClassIds.length > 0) {
      const exercises = await Exercise.find({
        classId: { $in: targetClassIds.map((id) => new mongoose.Types.ObjectId(id)) },
        dueAt: { $gte: fromDate, $lte: toDate },
      }).lean();

      if (exercises.length > 0) {
        const exerciseIds = exercises.map((e) => e._id);
        const submissions = await Submission.find({
          exerciseId: { $in: exerciseIds },
          studentId: user.id,
        }).lean();

        const submissionMap = new Map<string, (typeof submissions)[0]>();
        for (const s of submissions) {
          submissionMap.set(s.exerciseId.toString(), s);
        }

        const submissionIds = submissions.map((s) => s._id);
        const grades = await Grade.find({
          submissionId: { $in: submissionIds },
        }).lean();

        const gradeMap = new Map<string, (typeof grades)[0]>();
        for (const g of grades) {
          gradeMap.set(g.submissionId.toString(), g);
        }

        for (const ex of exercises) {
          const exIdStr = ex._id.toString();
          const classInfo = classMap.get(ex.classId.toString());
          const sub = submissionMap.get(exIdStr);
          const grade = sub ? gradeMap.get(sub._id.toString()) : undefined;

          const isPastDue = ex.dueAt.getTime() < now.getTime();
          let status: "pending" | "submitted" | "graded" | "completed" = "pending";

          if (user.role === "student") {
            if (grade) {
              status = "graded";
            } else if (sub) {
              status = "submitted";
            } else {
              status = "pending";
            }
          } else {
            // Đối với giáo viên
            status = isPastDue ? "completed" : "pending";
          }

          rawEvents.push({
            id: `exercise_${exIdStr}`,
            type: "exercise",
            title: ex.title,
            description: ex.description || "",
            dueAt: ex.dueAt.toISOString(),
            classId: ex.classId.toString(),
            className: classInfo?.name || "Lớp học",
            classCode: classInfo?.code || "",
            exerciseId: exIdStr,
            status,
            isOverdue: isPastDue && status === "pending",
            submissionId: sub?._id.toString(),
            grade: grade?.score,
          });
        }
      }
    }

    // 4. Truy vấn Task cá nhân nếu type !== "exercise"
    if (filter.type !== "exercise") {
      const taskQuery: Record<string, unknown> = {
        userId: user.id,
        dueDate: { $gte: fromDate, $lte: toDate },
      };

      if (filter.classId) {
        taskQuery.classId = new mongoose.Types.ObjectId(filter.classId);
      }

      const tasks = await Task.find(taskQuery).lean();

      for (const t of tasks) {
        const taskIdStr = t._id.toString();
        const isCompleted = t.status === "completed";
        const isPastDue = Boolean(t.dueDate && t.dueDate.getTime() < now.getTime());
        const classInfo = t.classId ? classMap.get(t.classId.toString()) : undefined;

        rawEvents.push({
          id: `task_${taskIdStr}`,
          type: "task",
          title: t.title,
          description: t.description || "",
          dueAt: t.dueDate ? t.dueDate.toISOString() : now.toISOString(),
          classId: t.classId?.toString(),
          className: classInfo?.name,
          classCode: classInfo?.code,
          status: isCompleted ? "completed" : "pending",
          isOverdue: isPastDue && !isCompleted,
          priority: t.priority,
          taskStatus: t.status,
        });
      }
    }

    // 5. Lọc theo status (nếu được yêu cầu)
    let filteredEvents = rawEvents;
    if (filter.status && filter.status !== "all") {
      if (filter.status === "pending") {
        filteredEvents = rawEvents.filter(
          (e) => (e.status === "pending" || e.status === "submitted") && !e.isOverdue
        );
      } else if (filter.status === "completed") {
        filteredEvents = rawEvents.filter(
          (e) => e.status === "completed" || e.status === "graded" || e.status === "submitted"
        );
      } else if (filter.status === "overdue") {
        filteredEvents = rawEvents.filter((e) => e.isOverdue);
      }
    }

    // 6. Sắp xếp theo hạn chót (dueAt) tăng dần
    filteredEvents.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());

    // 7. Tính toán summary toàn diện
    const summary: CalendarSummary = {
      total: rawEvents.length,
      exercises: rawEvents.filter((e) => e.type === "exercise").length,
      tasks: rawEvents.filter((e) => e.type === "task").length,
      pending: rawEvents.filter((e) => e.status === "pending" && !e.isOverdue).length,
      completed: rawEvents.filter(
        (e) => e.status === "completed" || e.status === "graded" || e.status === "submitted"
      ).length,
      overdue: rawEvents.filter((e) => e.isOverdue).length,
    };

    return {
      events: filteredEvents,
      summary,
    };
  }
}
