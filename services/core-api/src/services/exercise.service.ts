import mongoose from "mongoose";
import { HttpError } from "../lib/httpError.js";
import { assertClassMembership } from "../lib/classGuards.js";
import type { AuthUser } from "../middleware/requireAuth.js";
import { Exercise, Submission } from "../models/index.js";

export interface CreateExerciseInput {
  title: string;
  description: string;
  dueAt: string;
  attachmentUrl?: string;
}

/** Trong 1 giờ và chưa có bài nộp → cho phép sửa/xoá cứng. */
const MUTATE_WINDOW_MS = 60 * 60 * 1000;

export class ExerciseService {
  private static validateId(id: string) {
    if (!mongoose.isObjectIdOrHexString(id)) {
      throw new HttpError(400, "Invalid ID format", "INVALID_ID");
    }
  }

  private static async assertOwner(user: AuthUser, classId: string) {
    const { cls, membership } = await assertClassMembership(user.id, classId);
    if (user.role !== "teacher" || cls.teacherId !== user.id || membership.roleInClass !== "teacher") {
      throw new HttpError(403, "Only the class owner can manage exercises", "FORBIDDEN");
    }
    return { cls, membership };
  }

  private static parseDueAt(dueAt: string) {
    const due = new Date(dueAt);
    if (!Number.isFinite(due.getTime()) || due.getTime() <= Date.now()) {
      throw new HttpError(400, "Due date must be in the future", "INVALID_DUE_AT");
    }
    return due;
  }

  /** Khóa sửa/xoá nếu quá 1 giờ kể từ tạo, hoặc đã có ít nhất 1 bài nộp. */
  private static async assertMutable(exercise: { _id: unknown; createdAt?: Date }) {
    const createdAt = exercise.createdAt?.getTime?.() ?? 0;
    if (!createdAt || Date.now() - createdAt > MUTATE_WINDOW_MS) {
      throw new HttpError(
        409,
        "Không thể sửa/xoá bài tập sau 1 giờ kể từ khi tạo",
        "EXERCISE_LOCKED"
      );
    }
    const hasSubmission = await Submission.exists({ exerciseId: exercise._id });
    if (hasSubmission) {
      throw new HttpError(
        409,
        "Không thể sửa/xoá bài tập đã có học sinh nộp bài",
        "EXERCISE_HAS_SUBMISSIONS"
      );
    }
  }

  static async listExercises(user: AuthUser, classId: string) {
    await assertClassMembership(user.id, classId);
    return Exercise.find({ classId }).sort({ dueAt: 1, _id: 1 });
  }

  static async createExercise(user: AuthUser, classId: string, input: CreateExerciseInput) {
    const { cls } = await this.assertOwner(user, classId);
    const dueAt = this.parseDueAt(input.dueAt);
    return Exercise.create({
      classId: cls._id,
      title: input.title,
      description: input.description,
      attachmentUrl: (input.attachmentUrl ?? "").trim(),
      dueAt,
      createdBy: user.id,
    });
  }

  static async updateExercise(
    user: AuthUser,
    classId: string,
    exerciseId: string,
    input: CreateExerciseInput
  ) {
    await this.assertOwner(user, classId);
    this.validateId(exerciseId);
    const exercise = await Exercise.findOne({ _id: exerciseId, classId });
    if (!exercise) throw new HttpError(404, "Exercise not found", "EXERCISE_NOT_FOUND");
    await this.assertMutable(exercise);
    exercise.title = input.title;
    exercise.description = input.description;
    if (input.attachmentUrl !== undefined) {
      exercise.attachmentUrl = input.attachmentUrl.trim();
    }
    exercise.dueAt = this.parseDueAt(input.dueAt);
    await exercise.save();
    return exercise;
  }

  static async deleteExercise(user: AuthUser, classId: string, exerciseId: string) {
    await this.assertOwner(user, classId);
    this.validateId(exerciseId);
    const exercise = await Exercise.findOne({ _id: exerciseId, classId });
    if (!exercise) throw new HttpError(404, "Exercise not found", "EXERCISE_NOT_FOUND");
    await this.assertMutable(exercise);
    await Exercise.deleteOne({ _id: exercise._id });
    return { deleted: true, exerciseId: String(exercise._id) };
  }
}
