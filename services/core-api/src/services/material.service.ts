import mongoose from "mongoose";
import { HttpError } from "../lib/httpError.js";
import { ClassMember, ClassModel, Material } from "../models/index.js";

export class MaterialService {
  /**
   * Get all materials in a class (Members only: Teacher or enrolled Student)
   */
  static async getMaterials(userId: string, classId: string) {
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      throw new HttpError(400, "Định dạng ID lớp học không hợp lệ", "INVALID_ID");
    }

    const cls = await ClassModel.findById(classId);
    if (!cls) {
      throw new HttpError(404, "Không tìm thấy lớp học", "CLASS_NOT_FOUND");
    }

    // Check membership: must be teacher or enrolled student in class
    const membership = await ClassMember.findOne({
      classId,
      userId,
    });

    if (!membership && cls.teacherId !== userId) {
      throw new HttpError(403, "Bạn không phải là thành viên của lớp học này", "FORBIDDEN");
    }

    const materials = await Material.find({ classId }).sort({ createdAt: -1 });
    return materials;
  }

  /**
   * Add a new material link to class (Teacher of the class only)
   */
  static async createMaterial(
    userId: string,
    userRole: string,
    classId: string,
    data: { title: string; description?: string; url: string }
  ) {
    if (userRole !== "teacher") {
      throw new HttpError(403, "Chỉ giáo viên mới có thể thêm tài liệu vào lớp học", "FORBIDDEN");
    }

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      throw new HttpError(400, "Định dạng ID lớp học không hợp lệ", "INVALID_ID");
    }

    const cls = await ClassModel.findById(classId);
    if (!cls) {
      throw new HttpError(404, "Không tìm thấy lớp học", "CLASS_NOT_FOUND");
    }

    if (cls.teacherId !== userId) {
      throw new HttpError(403, "Chỉ giáo viên phụ trách lớp mới có thể thêm tài liệu", "FORBIDDEN");
    }

    // Validate URL format
    const trimmedUrl = data.url.trim();
    try {
      const parsedUrl = new URL(trimmedUrl);
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        throw new Error();
      }
    } catch {
      throw new HttpError(400, "Đường dẫn tài liệu phải là URL hợp lệ (bắt đầu bằng http:// hoặc https://)", "INVALID_URL");
    }

    const material = await Material.create({
      classId,
      title: data.title.trim(),
      description: data.description ? data.description.trim() : "",
      url: trimmedUrl,
      createdBy: userId,
    });

    return material;
  }

  /**
   * Delete a material in class (Teacher of the class only)
   */
  static async deleteMaterial(userId: string, userRole: string, classId: string, materialId: string) {
    if (userRole !== "teacher") {
      throw new HttpError(403, "Chỉ giáo viên mới có quyền xóa tài liệu", "FORBIDDEN");
    }

    if (!mongoose.Types.ObjectId.isValid(classId) || !mongoose.Types.ObjectId.isValid(materialId)) {
      throw new HttpError(400, "Định dạng ID không hợp lệ", "INVALID_ID");
    }

    const cls = await ClassModel.findById(classId);
    if (!cls) {
      throw new HttpError(404, "Không tìm thấy lớp học", "CLASS_NOT_FOUND");
    }

    if (cls.teacherId !== userId) {
      throw new HttpError(403, "Chỉ giáo viên phụ trách lớp mới có quyền xóa tài liệu", "FORBIDDEN");
    }

    const material = await Material.findOne({ _id: materialId, classId });
    if (!material) {
      throw new HttpError(404, "Không tìm thấy tài liệu này trong lớp học", "MATERIAL_NOT_FOUND");
    }

    await material.deleteOne();

    return {
      success: true,
      message: "Đã xóa tài liệu thành công",
    };
  }
}
