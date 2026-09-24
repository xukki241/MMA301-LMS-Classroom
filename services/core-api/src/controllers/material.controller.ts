import type { Request, Response } from "express";
import { z } from "zod";
import { HttpError } from "../lib/httpError.js";
import { MaterialService } from "../services/material.service.js";

const createMaterialSchema = z.object({
  title: z
    .string({ required_error: "Vui lòng nhập tiêu đề tài liệu" })
    .trim()
    .min(1, "Tiêu đề tài liệu không được để trống")
    .max(200, "Tiêu đề không được vượt quá 200 ký tự"),
  url: z
    .string({ required_error: "Vui lòng nhập đường dẫn URL tài liệu" })
    .trim()
    .min(1, "Đường dẫn liên kết không được để trống"),
  description: z
    .string()
    .trim()
    .max(1000, "Mô tả không được vượt quá 1000 ký tự")
    .optional(),
});

function parseBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const message = result.error.errors.map((e) => e.message).join(", ");
    throw new HttpError(400, message, "VALIDATION_ERROR");
  }
  return result.data;
}

export class MaterialController {
  /**
   * GET /classes/:classId/materials
   * Member lists all materials in class
   */
  static async listMaterials(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const classId = req.params.classId || req.params.id;

    const materials = await MaterialService.getMaterials(user.id, classId);
    res.status(200).json({ materials });
  }

  /**
   * POST /classes/:classId/materials
   * Teacher creates a new material link in class
   */
  static async createMaterial(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const classId = req.params.classId || req.params.id;
    const body = parseBody(createMaterialSchema, req.body);

    const material = await MaterialService.createMaterial(user.id, user.role, classId, body);

    res.status(201).json({
      message: "Thêm tài liệu thành công",
      material,
    });
  }

  /**
   * DELETE /classes/:classId/materials/:materialId
   * Teacher deletes a material from class
   */
  static async deleteMaterial(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const classId = req.params.classId || req.params.id;
    const { materialId } = req.params;

    const result = await MaterialService.deleteMaterial(user.id, user.role, classId, materialId);
    res.status(200).json(result);
  }
}
