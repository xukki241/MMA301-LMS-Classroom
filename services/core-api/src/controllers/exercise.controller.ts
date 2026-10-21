// Exercise controller - teacher creates exercises, students view and submit
import type { Request, Response } from "express";
import { z } from "zod";
import { HttpError } from "../lib/httpError.js";
import { ExerciseService } from "../services/exercise.service.js";

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(10000).default(""),
  attachmentUrl: z.string().max(2000).default(""),
  dueAt: z.unknown(),
}).strict();
const deadlineSchema = z.string().datetime({ offset: true });

function parseBody(body: unknown) {
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    throw new HttpError(422, parsed.error.errors.map((e) => e.message).join(", "), "VALIDATION_ERROR");
  }
  const deadline = deadlineSchema.safeParse(parsed.data.dueAt);
  if (!deadline.success) {
    throw new HttpError(400, "dueAt must be a valid ISO 8601 string with timezone", "INVALID_DUE_AT");
  }
  const attachmentUrl = parsed.data.attachmentUrl.trim();
  if (attachmentUrl) {
    try {
      const url = new URL(attachmentUrl);
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
    } catch {
      throw new HttpError(400, "attachmentUrl phải là http(s) URL hợp lệ", "INVALID_ATTACHMENT_URL");
    }
  }
  return {
    title: parsed.data.title,
    description: parsed.data.description,
    attachmentUrl,
    dueAt: deadline.data,
  };
}

export class ExerciseController {
  static async listExercises(req: Request, res: Response): Promise<void> {
    const exercises = await ExerciseService.listExercises(req.user!, req.params.classId);
    res.status(200).json({ exercises });
  }

  static async createExercise(req: Request, res: Response): Promise<void> {
    const input = parseBody(req.body);
    const exercise = await ExerciseService.createExercise(req.user!, req.params.classId, input);
    res.status(201).json({ message: "Exercise created successfully", exercise });
  }

  static async updateExercise(req: Request, res: Response): Promise<void> {
    const input = parseBody(req.body);
    const exercise = await ExerciseService.updateExercise(
      req.user!,
      req.params.classId,
      req.params.exerciseId,
      input
    );
    res.status(200).json({ message: "Exercise updated successfully", exercise });
  }

  static async deleteExercise(req: Request, res: Response): Promise<void> {
    const result = await ExerciseService.deleteExercise(
      req.user!,
      req.params.classId,
      req.params.exerciseId
    );
    res.status(200).json({ message: "Exercise deleted successfully", ...result });
  }
}
