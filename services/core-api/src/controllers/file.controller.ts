// File controller - Cloudinary-backed file upload and management
import type { Request, Response } from "express";
import { z } from "zod";
import { HttpError } from "../lib/httpError.js";
import { FileService } from "../services/file.service.js";

const uploadSchema = z.object({
  dataUri: z.string().min(32).max(25_000_000),
  fileName: z.string().max(200).optional(),
  mimeType: z.string().max(120).optional(),
  purpose: z.enum(["material", "exercise", "submission", "other"]).optional(),
});

export class FileController {
  static async status(_req: Request, res: Response): Promise<void> {
    res.status(200).json(await FileService.status());
  }

  static async list(req: Request, res: Response): Promise<void> {
    const files = await FileService.list(req.user!, req.params.classId);
    res.status(200).json({ files });
  }

  static async upload(req: Request, res: Response): Promise<void> {
    const parsed = uploadSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(422, parsed.error.errors.map((e) => e.message).join(", "), "VALIDATION_ERROR");
    }
    const file = await FileService.upload(req.user!, req.params.classId, parsed.data);
    res.status(201).json({ message: "Uploaded", file });
  }

  static async remove(req: Request, res: Response): Promise<void> {
    const result = await FileService.remove(req.user!, req.params.classId, req.params.fileId);
    res.status(200).json(result);
  }
}
