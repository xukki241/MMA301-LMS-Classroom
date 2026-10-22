// Material controller - class learning materials (upload, list, access control)
import type { Request, Response } from "express";
import { z } from "zod";
import { HttpError } from "../lib/httpError.js";
import { MaterialService } from "../services/material.service.js";

const httpUrl = z.string().trim().max(2048).refine((value) => {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}, "Đường dẫn tài liệu phải là URL hợp lệ (bắt đầu bằng http:// hoặc https://)");

const updateMaterialSchema = z.object({
  title: z.string().trim().min(2, "Tiêu đề tài liệu phải có ít nhất 2 ký tự").max(200, "Tiêu đề tài liệu tối đa 200 ký tự").optional(),
  description: z.string().trim().max(1000, "Mô tả tài liệu tối đa 1000 ký tự").optional(),
  url: httpUrl.optional(),
  priceVnd: z.coerce.number().min(0).max(50_000_000).optional(),
}).strict();

function parseUpdate(body: unknown) {
  const result = updateMaterialSchema.safeParse(body ?? {});
  if (!result.success) {
    throw new HttpError(422, result.error.errors.map((error) => error.message).join(", "), "VALIDATION_ERROR");
  }
  return result.data;
}

export class MaterialController {
  static async listMaterials(req: Request, res: Response): Promise<void> {
    const materials = await MaterialService.listMaterials(req.user!, req.params.classId);
    res.status(200).json({
      success: true,
      materials,
    });
  }

  static async createMaterial(req: Request, res: Response): Promise<void> {
    const material = await MaterialService.createMaterial(req.user!, req.params.classId, req.body);
    res.status(201).json({
      success: true,
      message: "Thêm tài liệu thành công",
      material,
    });
  }

  static async updateMaterial(req: Request, res: Response): Promise<void> {
    const material = await MaterialService.updateMaterial(
      req.user!,
      req.params.classId,
      req.params.materialId,
      parseUpdate(req.body)
    );
    res.status(200).json({ success: true, message: "Cập nhật tài liệu thành công", material });
  }

  static async deleteMaterial(req: Request, res: Response): Promise<void> {
    const result = await MaterialService.deleteMaterial(
      req.user!,
      req.params.classId,
      req.params.materialId
    );
    res.status(200).json(result);
  }
}
