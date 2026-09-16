import mongoose from "mongoose";
import { HttpError } from "../lib/httpError.js";
import { ClassModel, ClassMember } from "../models/index.js";

// Helper function to generate a random 6-character alphanumeric uppercase code
function generateClassCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate unique code with retry logic
async function generateUniqueClassCode(): Promise<string> {
  let attempts = 0;
  while (attempts < 10) {
    const code = generateClassCode();
    const existing = await ClassModel.findOne({ code });
    if (!existing) {
      return code;
    }
    attempts++;
  }
  throw new HttpError(500, "Không thể tạo mã lớp học duy nhất", "CODE_GENERATION_FAILED");
}

export class ClassService {
  /**
   * Create a new class (Teacher only)
   */
  static async createClass(teacherId: string, name: string) {
    const code = await generateUniqueClassCode();

    const newClass = await ClassModel.create({
      name,
      code,
      teacherId,
    });

    // Automatically add teacher as a class member
    await ClassMember.create({
      classId: newClass._id,
      userId: teacherId,
      roleInClass: "teacher",
    });

    return newClass;
  }

  /**
   * Get all classes taught by teacher
   */
  static async getTeachingClasses(teacherId: string) {
    const classes = await ClassModel.find({ teacherId }).sort({ createdAt: -1 });
    return classes;
  }

  /**
   * Get all classes student is enrolled in
   */
  static async getEnrolledClasses(studentId: string) {
    const memberships = await ClassMember.find({
      userId: studentId,
      roleInClass: "student",
    });

    const classIds = memberships.map((m) => m.classId);
    const classes = await ClassModel.find({ _id: { $in: classIds } }).sort({ createdAt: -1 });
    return classes;
  }

  /**
   * Join a class using class code (Student only)
   */
  static async joinClass(studentId: string, code: string) {
    const uppercaseCode = code.trim().toUpperCase();
    const cls = await ClassModel.findOne({ code: uppercaseCode });

    if (!cls) {
      throw new HttpError(404, "Không tồn tại lớp học có mã này", "CLASS_NOT_FOUND");
    }

    // Check duplicate membership
    const existingMember = await ClassMember.findOne({
      classId: cls._id,
      userId: studentId,
    });

    if (existingMember) {
      throw new HttpError(403, "Bạn đã là thành viên của lớp học này", "ALREADY_JOINED");
    }

    const membership = await ClassMember.create({
      classId: cls._id,
      userId: studentId,
      roleInClass: "student",
    });

    return { class: cls, membership };
  }

  /**
   * Get details of a class (Members only)
   */
  static async getClassDetails(userId: string, classId: string) {
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      throw new HttpError(400, "Định dạng ID lớp học không hợp lệ", "INVALID_ID");
    }

    const membership = await ClassMember.findOne({
      classId,
      userId,
    });

    if (!membership) {
      throw new HttpError(403, "Bạn không phải là thành viên của lớp học này", "FORBIDDEN");
    }

    const cls = await ClassModel.findById(classId);
    if (!cls) {
      throw new HttpError(404, "Không tìm thấy lớp học", "CLASS_NOT_FOUND");
    }

    return {
      class: cls,
      roleInClass: membership.roleInClass,
    };
  }

  /**
   * Get list of members in a class (Members only)
   */
  static async getClassMembers(userId: string, classId: string) {
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      throw new HttpError(400, "Định dạng ID lớp học không hợp lệ", "INVALID_ID");
    }

    const membership = await ClassMember.findOne({
      classId,
      userId,
    });

    if (!membership) {
      throw new HttpError(403, "Bạn không phải là thành viên của lớp học này", "FORBIDDEN");
    }

    const members = await ClassMember.find({ classId }).sort({ createdAt: 1 });
    return members;
  }

  /**
   * Update class name (Teacher owner only)
   */
  static async updateClass(teacherId: string, classId: string, name: string) {
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      throw new HttpError(400, "Định dạng ID lớp học không hợp lệ", "INVALID_ID");
    }

    const cls = await ClassModel.findById(classId);
    if (!cls) {
      throw new HttpError(404, "Không tìm thấy lớp học", "CLASS_NOT_FOUND");
    }

    if (cls.teacherId !== teacherId) {
      throw new HttpError(403, "Chỉ giáo viên tạo lớp mới có thể cập nhật lớp học này", "FORBIDDEN");
    }

    cls.name = name;
    await cls.save();

    return cls;
  }

  /**
   * Delete class (Teacher owner only)
   */
  static async deleteClass(teacherId: string, classId: string) {
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      throw new HttpError(400, "Định dạng ID lớp học không hợp lệ", "INVALID_ID");
    }

    const cls = await ClassModel.findById(classId);
    if (!cls) {
      throw new HttpError(404, "Không tìm thấy lớp học", "CLASS_NOT_FOUND");
    }

    if (cls.teacherId !== teacherId) {
      throw new HttpError(403, "Chỉ giáo viên tạo lớp mới có thể xóa lớp học này", "FORBIDDEN");
    }

    await ClassModel.deleteOne({ _id: classId });
    await ClassMember.deleteMany({ classId });

    return { message: "Xóa lớp học thành công" };
  }
}
