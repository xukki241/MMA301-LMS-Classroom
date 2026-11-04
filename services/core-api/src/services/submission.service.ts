import mongoose from "mongoose";
import { HttpError } from "../lib/httpError.js";
import { assertClassMembership } from "../lib/classGuards.js";
import type { AuthUser } from "../middleware/requireAuth.js";
import { ClassMember, ClassModel, Exercise, Submission, Grade } from "../models/index.js";

export type SubmissionHistoryItem = {
  id: string;
  exerciseId: string;
  exerciseTitle: string;
  classId: string;
  className: string;
  studentId: string;
  content: string;
  url: string;
  submittedAt: string;
  dueAt: string;
  score: number | null;
  feedback: string;
  status: "submitted" | "graded";
};

export interface SubmissionInput {
  content: string;
  url: string;
}

export interface GradeInput {
  score: number;
  feedback: string;
}

export class SubmissionService {
  /**
   * Học sinh: bài mình đã nộp.
   * Giáo viên: bài nộp trong lớp mình chủ (mới nhất trước).
   */
  static async listMySubmissions(user: AuthUser): Promise<SubmissionHistoryItem[]> {
    let submissions;
    let exercises;

    if (user.role === "student") {
      submissions = await Submission.find({ studentId: user.id }).sort({ submittedAt: -1, _id: -1 }).lean();
      if (submissions.length === 0) return [];
      const exerciseIds = [...new Set(submissions.map((s) => String(s.exerciseId)))];
      exercises = await Exercise.find({ _id: { $in: exerciseIds } }).lean();
    } else if (user.role === "teacher") {
      const owned = await ClassModel.find({ teacherId: user.id }).select("_id").lean();
      const classIds = owned.map((c) => c._id);
      if (classIds.length === 0) return [];
      exercises = await Exercise.find({ classId: { $in: classIds } }).lean();
      const exerciseIds = exercises.map((e) => e._id);
      if (exerciseIds.length === 0) return [];
      submissions = await Submission.find({ exerciseId: { $in: exerciseIds } })
        .sort({ submittedAt: -1, _id: -1 })
        .limit(200)
        .lean();
    } else {
      throw new HttpError(403, "Không có quyền xem lịch sử nộp bài", "FORBIDDEN");
    }

    if (submissions.length === 0) return [];

    const grades = await Grade.find({ submissionId: { $in: submissions.map((s) => s._id) } }).lean();
    const exerciseById = new Map(exercises.map((e) => [String(e._id), e]));
    const gradeBySubmission = new Map(grades.map((g) => [String(g.submissionId), g]));
    const classIds = [...new Set(exercises.map((e) => String(e.classId)))];
    const classes = await ClassModel.find({ _id: { $in: classIds } }).select("_id name").lean();
    const className = new Map(classes.map((c) => [String(c._id), c.name]));

    return submissions.map((row) => {
      const exercise = exerciseById.get(String(row.exerciseId));
      const grade = gradeBySubmission.get(String(row._id));
      const classId = exercise ? String(exercise.classId) : "";
      return {
        id: String(row._id),
        exerciseId: String(row.exerciseId),
        exerciseTitle: exercise?.title ?? "Bài tập đã xóa",
        classId,
        className: className.get(classId) ?? "",
        studentId: String(row.studentId),
        content: String(row.content ?? ""),
        url: String(row.url ?? ""),
        submittedAt: (row.submittedAt as Date).toISOString(),
        dueAt: exercise?.dueAt ? exercise.dueAt.toISOString() : "",
        score: grade?.score ?? null,
        feedback: grade?.feedback ?? "",
        status: grade ? "graded" : "submitted",
      };
    });
  }

  private static validateId(id: string) {
    if (!mongoose.isObjectIdOrHexString(id)) {
      throw new HttpError(400, "Invalid ID format", "INVALID_ID");
    }
  }

  // Every operation checks the class membership and the exercise's parent class.
  private static async getContext(user: AuthUser, classId: string, exerciseId: string) {
    const { cls, membership } = await assertClassMembership(user.id, classId);
    this.validateId(exerciseId);
    const exercise = await Exercise.findOne({ _id: exerciseId, classId });
    if (!exercise) throw new HttpError(404, "Exercise not found in this class", "EXERCISE_NOT_FOUND");
    return { cls, membership, exercise };
  }

  private static assertStudent(user: AuthUser, roleInClass: string) {
    if (user.role !== "student" || roleInClass !== "student") {
      throw new HttpError(403, "Only enrolled students can submit exercises", "FORBIDDEN");
    }
  }

  private static assertBeforeDeadline(dueAt: Date) {
    if (Date.now() >= dueAt.getTime()) {
      throw new HttpError(400, "Deadline has passed", "DEADLINE_PASSED");
    }
  }

  private static assertOwner(user: AuthUser, teacherId: string, roleInClass: string) {
    if (user.role !== "teacher" || roleInClass !== "teacher" || teacherId !== user.id) {
      throw new HttpError(403, "Only the class owner can view and grade submissions", "FORBIDDEN");
    }
  }

  private static async findSubmission(exerciseId: string, submissionId: string) {
    this.validateId(submissionId);
    const submission = await Submission.findOne({ _id: submissionId, exerciseId });
    if (!submission) throw new HttpError(404, "Submission not found in this exercise", "SUBMISSION_NOT_FOUND");
    return submission;
  }

  static async getMySubmission(user: AuthUser, classId: string, exerciseId: string) {
    const { membership } = await this.getContext(user, classId, exerciseId);
    this.assertStudent(user, membership.roleInClass);
    const submission = await Submission.findOne({ exerciseId, studentId: user.id });
    if (!submission) throw new HttpError(404, "No submission found", "SUBMISSION_NOT_FOUND");
    const grade = await Grade.findOne({ submissionId: submission._id });
    return { submission, grade };
  }

  static async getSubmission(user: AuthUser, classId: string, exerciseId: string, submissionId: string) {
    const { cls, membership } = await this.getContext(user, classId, exerciseId);
    const submission = await this.findSubmission(exerciseId, submissionId);
    if (user.role === "teacher") {
      this.assertOwner(user, cls.teacherId, membership.roleInClass);
    } else {
      this.assertStudent(user, membership.roleInClass);
      if (submission.studentId !== user.id) throw new HttpError(403, "Cannot view another student's submission", "FORBIDDEN");
    }
    const grade = await Grade.findOne({ submissionId: submission._id });
    return { submission, grade };
  }

  static async listSubmissions(user: AuthUser, classId: string, exerciseId: string) {
    const { cls, membership } = await this.getContext(user, classId, exerciseId);
    this.assertOwner(user, cls.teacherId, membership.roleInClass);
    const submissions = await Submission.find({ exerciseId }).sort({ submittedAt: 1, _id: 1 }).lean();
    const grades = await Grade.find({ submissionId: { $in: submissions.map(s => s._id) } }).lean();
    const gradesBySubmission = new Map(grades.map(g => [String(g.submissionId), g]));
    const studentIds = submissions.map((s) => String(s.studentId));
    const members = await ClassMember.find({ classId, userId: { $in: studentIds } })
      .select("userId displayName")
      .lean();
    const nameById = new Map(members.map((m) => [String(m.userId), String(m.displayName ?? "").trim()]));
    return submissions.map((s) => ({
      ...s,
      studentDisplayName: nameById.get(String(s.studentId)) || "Học sinh",
      grade: gradesBySubmission.get(String(s._id)) ?? null,
    }));
  }

  static async putGrade(user: AuthUser, classId: string, exerciseId: string, submissionId: string, input: GradeInput) {
    const { cls, membership, exercise } = await this.getContext(user, classId, exerciseId);
    this.assertOwner(user, cls.teacherId, membership.roleInClass);
    const submission = await this.findSubmission(exerciseId, submissionId);
    if (Date.now() < exercise.dueAt.getTime()) {
      throw new HttpError(400, "Grading is only allowed after the deadline", "GRADING_NOT_OPEN");
    }
    const filter = { submissionId: submission._id };
    const update = { $set: { score: input.score, feedback: input.feedback, gradedBy: user.id, gradedAt: new Date(Date.now()) } };
    try {
      return await Grade.findOneAndUpdate(filter, update, { upsert: true, new: true, runValidators: true });
    } catch (error) {
      // Two first grades can race; update the winner's row instead of creating a second grade.
      if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
        return Grade.findOneAndUpdate(filter, update, { new: true, runValidators: true });
      }
      throw error;
    }
  }

  static async createSubmission(user: AuthUser, classId: string, exerciseId: string, input: SubmissionInput) {
    const { membership, exercise } = await this.getContext(user, classId, exerciseId);
    this.assertStudent(user, membership.roleInClass);
    this.assertBeforeDeadline(exercise.dueAt);
    try {
      return await Submission.create({
        exerciseId: exercise._id, studentId: user.id,
        content: input.content, url: input.url, submittedAt: new Date(Date.now()),
      });
    } catch (error) {
      if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
        throw new HttpError(409, "Submission already exists; use PUT to update before the deadline", "SUBMISSION_EXISTS");
      }
      throw error;
    }
  }

  static async updateMySubmission(user: AuthUser, classId: string, exerciseId: string, input: SubmissionInput) {
    const { membership, exercise } = await this.getContext(user, classId, exerciseId);
    this.assertStudent(user, membership.roleInClass);
    const existing = await Submission.findOne({ exerciseId, studentId: user.id });
    if (!existing) throw new HttpError(404, "No submission found", "SUBMISSION_NOT_FOUND");
    const grade = await Grade.findOne({ submissionId: existing._id });
    if (grade) {
      throw new HttpError(409, "Không thể nộp lại sau khi đã chấm điểm", "ALREADY_GRADED");
    }
    // Nộp đè được khi chưa chấm điểm (kể cả sau hạn). void exercise giữ lint sạch.
    void exercise;
    existing.content = input.content;
    existing.url = input.url;
    existing.submittedAt = new Date(Date.now());
    await existing.save();
    return existing;
  }
}
