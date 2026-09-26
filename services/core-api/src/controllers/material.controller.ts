import type { Request, Response } from "express";
import { MaterialService } from "../services/material.service.js";

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

  static async deleteMaterial(req: Request, res: Response): Promise<void> {
    const result = await MaterialService.deleteMaterial(
      req.user!,
      req.params.classId,
      req.params.materialId
    );
    res.status(200).json(result);
  }
}
