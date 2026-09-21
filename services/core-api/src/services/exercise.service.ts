import mongoose from "mongoose";
import { HttpError } from "../lib/httpError.js";
import type { AuthUser } from "../middleware/requireAuth.js";
import { ClassModel, ClassMember, Exercise } from "../models/index.js";

export interface CreateExerciseInput {
  title: string;
  description: string;
  dueAt: string;
}

export class ExerciseService {
  private static async assertClassMember(userId: string, classId: string) {
    if (!mongoose.isObjectIdOrHexString(classId)) {
      throw new HttpError(400, "Định dạng ID lớp học không hợp lệ", "INVALID_ID");
    }
    const cls = await ClassModel.findById(classId);
    if (!cls) {
      throw new HttpError(404, "Không tìm thấy lớp học", "CLASS_NOT_FOUND");
    }
    const membership = await ClassMember.findOne({ classId, userId });
    if (!membership) {
      throw new HttpError(403, "Bạn không phải là thành viên của lớp học này", "FORBIDDEN");
    }
    return { cls, membership };
  }

  static async createExercise(user: AuthUser, classId: string, input: CreateExerciseInput) {
    const { cls, membership } = await this.assertClassMember(user.id, classId);
    if (user.role !== "teacher" || cls.teacherId !== user.id || membership.roleInClass !== "teacher") {
      throw new HttpError(403, "Chỉ giáo viên sở hữu lớp mới có thể tạo bài tập", "FORBIDDEN");
    }
    const dueAt = new Date(input.dueAt);
    if (!Number.isFinite(dueAt.getTime()) || dueAt.getTime() <= Date.now()) {
      throw new HttpError(400, "Hạn nộp phải nằm trong tương lai", "INVALID_DUE_AT");
    }
    return Exercise.create({
      classId: cls._id,
      title: input.title,
      description: input.description,
      dueAt,
      createdBy: user.id,
    });
  }
}
