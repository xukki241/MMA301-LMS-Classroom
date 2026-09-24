import mongoose from "mongoose";
import { HttpError } from "../lib/httpError.js";
import type { AuthUser } from "../middleware/requireAuth.js";
import { ClassModel, ClassMember, Exercise, Submission, Grade } from "../models/index.js";

export interface SubmissionInput {
  content: string;
  url: string;
}

export interface GradeInput {
  score: number;
  feedback: string;
}

export class SubmissionService {
  private static validateId(id: string) {
    if (!mongoose.isObjectIdOrHexString(id)) {
      throw new HttpError(400, "Định dạng ID không hợp lệ", "INVALID_ID");
    }
  }

  // Every operation checks the class membership and the exercise's parent class.
  private static async getContext(user: AuthUser, classId: string, exerciseId: string) {
    this.validateId(classId);
    this.validateId(exerciseId);
    const cls = await ClassModel.findById(classId);
    if (!cls) throw new HttpError(404, "Không tìm thấy lớp học", "CLASS_NOT_FOUND");
    const membership = await ClassMember.findOne({ classId, userId: user.id });
    if (!membership) throw new HttpError(403, "Bạn không phải thành viên lớp", "FORBIDDEN");
    const exercise = await Exercise.findOne({ _id: exerciseId, classId });
    if (!exercise) throw new HttpError(404, "Không tìm thấy bài tập trong lớp", "EXERCISE_NOT_FOUND");
    return { cls, membership, exercise };
  }

  private static assertStudent(user: AuthUser, roleInClass: string) {
    if (user.role !== "student" || roleInClass !== "student") {
      throw new HttpError(403, "Chỉ học sinh trong lớp được nộp bài", "FORBIDDEN");
    }
  }

  private static assertBeforeDeadline(dueAt: Date) {
    if (Date.now() >= dueAt.getTime()) {
      throw new HttpError(400, "Đã hết hạn nộp bài", "DEADLINE_PASSED");
    }
  }

  private static assertOwner(user: AuthUser, teacherId: string, roleInClass: string) {
    if (user.role !== "teacher" || roleInClass !== "teacher" || teacherId !== user.id) {
      throw new HttpError(403, "Chỉ giáo viên sở hữu lớp được xem và chấm bài", "FORBIDDEN");
    }
  }

  private static async findSubmission(exerciseId: string, submissionId: string) {
    this.validateId(submissionId);
    const submission = await Submission.findOne({ _id: submissionId, exerciseId });
    if (!submission) throw new HttpError(404, "Không tìm thấy bài nộp trong bài tập", "SUBMISSION_NOT_FOUND");
    return submission;
  }

  static async getMySubmission(user: AuthUser, classId: string, exerciseId: string) {
    const { membership } = await this.getContext(user, classId, exerciseId);
    this.assertStudent(user, membership.roleInClass);
    const submission = await Submission.findOne({ exerciseId, studentId: user.id });
    if (!submission) throw new HttpError(404, "Chưa có bài nộp", "SUBMISSION_NOT_FOUND");
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
      if (submission.studentId !== user.id) throw new HttpError(403, "Không được xem bài của học sinh khác", "FORBIDDEN");
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
    return submissions.map(s => ({ ...s, grade: gradesBySubmission.get(String(s._id)) ?? null }));
  }

  static async putGrade(user: AuthUser, classId: string, exerciseId: string, submissionId: string, input: GradeInput) {
    const { cls, membership, exercise } = await this.getContext(user, classId, exerciseId);
    this.assertOwner(user, cls.teacherId, membership.roleInClass);
    const submission = await this.findSubmission(exerciseId, submissionId);
    if (Date.now() < exercise.dueAt.getTime()) {
      throw new HttpError(400, "Chỉ chấm điểm sau hạn nộp bài", "GRADING_NOT_OPEN");
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
        throw new HttpError(409, "Đã nộp bài; dùng PUT để sửa trước hạn", "SUBMISSION_EXISTS");
      }
      throw error;
    }
  }

  static async updateMySubmission(user: AuthUser, classId: string, exerciseId: string, input: SubmissionInput) {
    const { membership, exercise } = await this.getContext(user, classId, exerciseId);
    this.assertStudent(user, membership.roleInClass);
    this.assertBeforeDeadline(exercise.dueAt);
    const submission = await Submission.findOneAndUpdate(
      { exerciseId, studentId: user.id },
      { $set: { content: input.content, url: input.url, submittedAt: new Date(Date.now()) } },
      { new: true, runValidators: true },
    );
    if (!submission) throw new HttpError(404, "Chưa có bài nộp", "SUBMISSION_NOT_FOUND");
    return submission;
  }
}
