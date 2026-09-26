import mongoose from "mongoose";
import { HttpError } from "../lib/httpError.js";
import type { AuthUser } from "../middleware/requireAuth.js";
import { ClassMember, ClassModel, Material } from "../models/index.js";

export interface CreateMaterialInput {
  title: string;
  url: string;
  description?: string;
}

export class MaterialService {
  /**
   * Get all materials in a class (Members only: Teacher or enrolled Student)
   */
  static async listMaterials(userOrUserId: AuthUser | string, classId: string) {
    const userId = typeof userOrUserId === "string" ? userOrUserId : userOrUserId.id;

    if (!mongoose.isObjectIdOrHexString(classId)) {
      throw new HttpError(400, "Định dạng ID lớp học không hợp lệ", "INVALID_ID");
    }

    const cls = await ClassModel.findById(classId);
    if (!cls) {
      throw new HttpError(404, "Không tìm thấy lớp học", "CLASS_NOT_FOUND");
    }

    // Check membership: must be class teacher or enrolled student
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
   * Add a new material link to class (Teacher owner of the class only)
   */
  static async createMaterial(
    user: AuthUser,
    classId: string,
    data: CreateMaterialInput
  ) {
    if (user.role !== "teacher") {
      throw new HttpError(403, "Chỉ giáo viên mới có thể thêm tài liệu vào lớp học", "FORBIDDEN");
    }

    if (!mongoose.isObjectIdOrHexString(classId)) {
      throw new HttpError(400, "Định dạng ID lớp học không hợp lệ", "INVALID_ID");
    }

    const cls = await ClassModel.findById(classId);
    if (!cls) {
      throw new HttpError(404, "Không tìm thấy lớp học", "CLASS_NOT_FOUND");
    }

    if (cls.teacherId !== user.id) {
      throw new HttpError(403, "Chỉ giáo viên phụ trách lớp mới có thể thêm tài liệu", "FORBIDDEN");
    }

    const membership = await ClassMember.findOne({ classId, userId: user.id });
    if (membership && membership.roleInClass !== "teacher") {
      throw new HttpError(403, "Chỉ giáo viên phụ trách lớp mới có thể thêm tài liệu", "FORBIDDEN");
    }

    const trimmedTitle = (data.title || "").trim();
    if (!trimmedTitle || trimmedTitle.length < 2) {
      throw new HttpError(400, "Tiêu đề tài liệu phải có ít nhất 2 ký tự", "INVALID_TITLE");
    }

    const trimmedUrl = (data.url || "").trim();
    try {
      const parsedUrl = new URL(trimmedUrl);
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        throw new Error();
      }
    } catch {
      throw new HttpError(
        400,
        "Đường dẫn tài liệu phải là URL hợp lệ (bắt đầu bằng http:// hoặc https://)",
        "INVALID_URL"
      );
    }

    const material = await Material.create({
      classId,
      title: trimmedTitle,
      description: data.description ? data.description.trim() : "",
      url: trimmedUrl,
      createdBy: user.id,
    });

    return material;
  }

  /**
   * Delete a material in class (Teacher owner of the class only)
   */
  static async deleteMaterial(user: AuthUser, classId: string, materialId: string) {
    if (user.role !== "teacher") {
      throw new HttpError(403, "Chỉ giáo viên mới có quyền xóa tài liệu", "FORBIDDEN");
    }

    if (!mongoose.isObjectIdOrHexString(classId) || !mongoose.isObjectIdOrHexString(materialId)) {
      throw new HttpError(400, "Định dạng ID không hợp lệ", "INVALID_ID");
    }

    const cls = await ClassModel.findById(classId);
    if (!cls) {
      throw new HttpError(404, "Không tìm thấy lớp học", "CLASS_NOT_FOUND");
    }

    if (cls.teacherId !== user.id) {
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
