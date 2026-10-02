import type { Request, Response } from "express";
import { z } from "zod";
import { HttpError } from "../lib/httpError.js";
import { ExerciseService } from "../services/exercise.service.js";

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(10000).default(""),
  // Validate separately so all deadline errors use the task's required HTTP 400.
  dueAt: z.unknown(),
}).strict();
const deadlineSchema = z.string().datetime({ offset: true });

export class ExerciseController {
  static async listExercises(req: Request, res: Response): Promise<void> {
    const exercises = await ExerciseService.listExercises(req.user!, req.params.classId);
    res.status(200).json({ exercises });
  }

  static async createExercise(req: Request, res: Response): Promise<void> {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(422, parsed.error.errors.map(e => e.message).join(", "), "VALIDATION_ERROR");
    }
    const deadline = deadlineSchema.safeParse(parsed.data.dueAt);
    if (!deadline.success) {
      throw new HttpError(400, "dueAt must be a valid ISO 8601 string with timezone", "INVALID_DUE_AT");
    }
    const exercise = await ExerciseService.createExercise(req.user!, req.params.classId, {
      title: parsed.data.title,
      description: parsed.data.description,
      dueAt: deadline.data,
    });
    res.status(201).json({ message: "Exercise created successfully", exercise });
  }
}
