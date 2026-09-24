import mongoose from "mongoose";
import { HttpError } from "../lib/httpError.js";
import { Assignment, ClassMember, ClassModel } from "../models/index.js";

export class AssignmentService {
  /**
   * Check membership: teacher of class OR enrolled student
   */
  private static async assertMember(userId: string, classId: string) {
    const cls = await ClassModel.findById(classId);
    if (!cls) throw new HttpError(404, "Không tìm thấy lớp học", "CLASS_NOT_FOUND");

    const isMember = await ClassMember.findOne({ classId, userId });
    if (!isMember && cls.teacherId !== userId) {
      throw new HttpError(403, "Bạn không phải thành viên lớp học này", "FORBIDDEN");
    }
    return cls;
  }

  /**
   * GET /classes/:id/assignments — Teacher or enrolled student
   */
  static async getAssignments(userId: string, classId: string) {
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      throw new HttpError(400, "ID lớp học không hợp lệ", "INVALID_ID");
    }
    await this.assertMember(userId, classId);
    return Assignment.find({ classId }).sort({ createdAt: -1 });
  }

  /**
   * POST /classes/:id/assignments — Teacher of class only
   */
  static async createAssignment(
    userId: string,
    userRole: string,
    classId: string,
    data: { title: string; description?: string; dueDate?: string; maxScore?: number }
  ) {
    if (userRole !== "teacher") {
      throw new HttpError(403, "Chỉ giáo viên mới có thể thêm bài tập", "FORBIDDEN");
    }
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      throw new HttpError(400, "ID lớp học không hợp lệ", "INVALID_ID");
    }

    const cls = await ClassModel.findById(classId);
    if (!cls) throw new HttpError(404, "Không tìm thấy lớp học", "CLASS_NOT_FOUND");
    if (cls.teacherId !== userId) {
      throw new HttpError(403, "Chỉ giáo viên phụ trách lớp mới có thể thêm bài tập", "FORBIDDEN");
    }

    const trimmedTitle = data.title.trim();
    if (!trimmedTitle) {
      throw new HttpError(400, "Tiêu đề bài tập không được để trống", "VALIDATION_ERROR");
    }

    let dueDate: Date | null = null;
    if (data.dueDate) {
      dueDate = new Date(data.dueDate);
      if (isNaN(dueDate.getTime())) {
        throw new HttpError(400, "Ngày hết hạn không hợp lệ", "VALIDATION_ERROR");
      }
    }

    return Assignment.create({
      classId,
      title: trimmedTitle,
      description: data.description?.trim() ?? "",
      dueDate,
      maxScore: data.maxScore ?? 100,
      createdBy: userId,
    });
  }

  /**
   * DELETE /classes/:id/assignments/:assignmentId — Teacher of class only
   */
  static async deleteAssignment(userId: string, userRole: string, classId: string, assignmentId: string) {
    if (userRole !== "teacher") {
      throw new HttpError(403, "Chỉ giáo viên mới có quyền xóa bài tập", "FORBIDDEN");
    }
    if (!mongoose.Types.ObjectId.isValid(classId) || !mongoose.Types.ObjectId.isValid(assignmentId)) {
      throw new HttpError(400, "ID không hợp lệ", "INVALID_ID");
    }

    const cls = await ClassModel.findById(classId);
    if (!cls) throw new HttpError(404, "Không tìm thấy lớp học", "CLASS_NOT_FOUND");
    if (cls.teacherId !== userId) {
      throw new HttpError(403, "Chỉ giáo viên phụ trách lớp mới có quyền xóa bài tập", "FORBIDDEN");
    }

    const assignment = await Assignment.findOne({ _id: assignmentId, classId });
    if (!assignment) throw new HttpError(404, "Không tìm thấy bài tập", "ASSIGNMENT_NOT_FOUND");

    await assignment.deleteOne();
    return { success: true, message: "Đã xóa bài tập thành công" };
  }
}
