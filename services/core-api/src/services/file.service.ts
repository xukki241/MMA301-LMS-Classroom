import mongoose from "mongoose";
import { env } from "../config/env.js";
import { assertCloudinaryConfigured, cloudinary } from "../lib/cloudinary.js";
import { HttpError } from "../lib/httpError.js";
import { assertClassMembership } from "../lib/classGuards.js";
import type { AuthUser } from "../middleware/requireAuth.js";
import { ClassFile } from "../models/index.js";

export type FilePurpose = "material" | "exercise" | "submission" | "other";

export class FileService {
  static async list(user: AuthUser, classId: string) {
    await assertClassMembership(user.id, classId);
    const rows = await ClassFile.find({ classId }).sort({ createdAt: -1 }).lean();
    return rows.map((row) => ({
      id: String(row._id),
      classId: String(row.classId),
      uploadedBy: row.uploadedBy,
      uploaderDisplayName: row.uploaderDisplayName || "",
      purpose: row.purpose,
      publicId: row.publicId,
      url: row.secureUrl || row.url,
      resourceType: row.resourceType,
      format: row.format,
      bytes: row.bytes,
      originalFilename: row.originalFilename,
      mimeType: row.mimeType,
      createdAt: row.createdAt ? new Date(row.createdAt as Date).toISOString() : undefined,
    }));
  }

  static async upload(
    user: AuthUser,
    classId: string,
    input: {
      dataUri: string;
      fileName?: string;
      mimeType?: string;
      purpose?: FilePurpose;
    },
  ) {
    await assertClassMembership(user.id, classId);
    assertCloudinaryConfigured();

    if (!mongoose.isObjectIdOrHexString(classId)) {
      throw new HttpError(400, "Invalid class id", "INVALID_ID");
    }
    const dataUri = String(input.dataUri ?? "").trim();
    if (!dataUri.startsWith("data:") || !dataUri.includes("base64,")) {
      throw new HttpError(400, "dataUri phải là data URL base64", "INVALID_DATA_URI");
    }

    const folder = `${env.CLOUDINARY_FOLDER}/${classId}`;
    const purpose = input.purpose ?? "other";
    const result = await cloudinary.uploader.upload(dataUri, {
      folder,
      resource_type: "auto",
      use_filename: true,
      unique_filename: true,
      filename_override: input.fileName?.replace(/[^\w.\-]+/g, "_").slice(0, 120) || undefined,
    });

    const doc = await ClassFile.create({
      classId,
      uploadedBy: user.id,
      uploaderDisplayName: user.displayName ?? "",
      purpose,
      publicId: result.public_id,
      url: result.url,
      secureUrl: result.secure_url,
      resourceType: result.resource_type,
      format: result.format ?? "",
      bytes: result.bytes ?? 0,
      originalFilename: input.fileName || result.original_filename || "",
      mimeType: input.mimeType || "",
    });

    return {
      id: String(doc._id),
      classId,
      url: doc.secureUrl,
      publicId: doc.publicId,
      bytes: doc.bytes,
      originalFilename: doc.originalFilename,
      purpose: doc.purpose,
      format: doc.format,
      resourceType: doc.resourceType,
    };
  }

  static async remove(user: AuthUser, classId: string, fileId: string) {
    const { cls, membership } = await assertClassMembership(user.id, classId);
    if (!mongoose.isObjectIdOrHexString(fileId)) {
      throw new HttpError(400, "Invalid file id", "INVALID_ID");
    }
    const file = await ClassFile.findOne({ _id: fileId, classId });
    if (!file) throw new HttpError(404, "Không tìm thấy file", "FILE_NOT_FOUND");

    const isOwner = file.uploadedBy === user.id;
    const isTeacher = membership.roleInClass === "teacher" || cls.teacherId === user.id;
    if (!isOwner && !isTeacher) {
      throw new HttpError(403, "Không có quyền xóa file này", "FORBIDDEN");
    }

    assertCloudinaryConfigured();
    try {
      await cloudinary.uploader.destroy(file.publicId, {
        resource_type: (file.resourceType as "image" | "video" | "raw") || "raw",
        invalidate: true,
      });
    } catch (error) {
      console.warn("[cloudinary] destroy failed", file.publicId, error);
    }
    await file.deleteOne();
    return { success: true, id: fileId };
  }

  static async status() {
    return {
      configured: Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET),
      cloudName: env.CLOUDINARY_CLOUD_NAME ? "***" : null,
      folder: env.CLOUDINARY_FOLDER,
    };
  }
}
