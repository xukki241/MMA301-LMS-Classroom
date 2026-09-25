import { HttpError } from "../lib/httpError.js";
import { assertClassMembership } from "../lib/classGuards.js";
import type { AuthUser } from "../middleware/requireAuth.js";
import { Exercise } from "../models/index.js";

export interface CreateExerciseInput {
  title: string;
  description: string;
  dueAt: string;
}

export class ExerciseService {
  static async listExercises(user: AuthUser, classId: string) {
    await assertClassMembership(user.id, classId);
    return Exercise.find({ classId }).sort({ dueAt: 1, _id: 1 });
  }

  static async createExercise(user: AuthUser, classId: string, input: CreateExerciseInput) {
    const { cls, membership } = await assertClassMembership(user.id, classId);
    if (user.role !== "teacher" || cls.teacherId !== user.id || membership.roleInClass !== "teacher") {
      throw new HttpError(403, "Only the class owner can create exercises", "FORBIDDEN");
    }
    const dueAt = new Date(input.dueAt);
    if (!Number.isFinite(dueAt.getTime()) || dueAt.getTime() <= Date.now()) {
      throw new HttpError(400, "Due date must be in the future", "INVALID_DUE_AT");
    }
    return Exercise.create({
      classId: cls._id,
      title: input.title,
      description: input.description,
      dueAt,
      createdBy: user.id,
    });
  }
}
