import mongoose from "mongoose";
import { HttpError } from "../lib/httpError.js";
import { assertClassMembership } from "../lib/classGuards.js";
import type { AuthUser } from "../middleware/requireAuth.js";
import { ClassSession, Exam } from "../models/index.js";

export interface SessionInput {
  weekday: number;
  startTime: string;
  endTime: string;
  room: string;
  note: string;
}

export interface ExamInput {
  title: string;
  startsAt: string;
  durationMinutes: number;
  room: string;
  note: string;
}

function assertOwner(user: AuthUser, teacherId: string, roleInClass: string) {
  if (user.role !== "teacher" || teacherId !== user.id || roleInClass !== "teacher") {
    throw new HttpError(403, "Only the class owner can manage the schedule", "FORBIDDEN");
  }
}

function assertId(id: string) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new HttpError(400, "Invalid ID format", "INVALID_ID");
  }
}

export class ScheduleService {
  static async listSessions(user: AuthUser, classId: string) {
    await assertClassMembership(user.id, classId);
    return ClassSession.find({ classId }).sort({ weekday: 1, startTime: 1, _id: 1 });
  }

  static async createSession(user: AuthUser, classId: string, input: SessionInput) {
    const { cls, membership } = await assertClassMembership(user.id, classId);
    assertOwner(user, cls.teacherId, membership.roleInClass);
    if (input.endTime <= input.startTime) {
      throw new HttpError(400, "endTime must be later than startTime", "INVALID_TIME_RANGE");
    }
    return ClassSession.create({ classId: cls._id, ...input, createdBy: user.id });
  }

  static async deleteSession(user: AuthUser, classId: string, sessionId: string) {
    const { cls, membership } = await assertClassMembership(user.id, classId);
    assertOwner(user, cls.teacherId, membership.roleInClass);
    assertId(sessionId);
    const removed = await ClassSession.findOneAndDelete({ _id: sessionId, classId });
    if (!removed) throw new HttpError(404, "Session not found in this class", "SESSION_NOT_FOUND");
    return { message: "Session deleted successfully" };
  }

  static async listExams(user: AuthUser, classId: string) {
    await assertClassMembership(user.id, classId);
    return Exam.find({ classId }).sort({ startsAt: 1, _id: 1 });
  }

  static async createExam(user: AuthUser, classId: string, input: ExamInput) {
    const { cls, membership } = await assertClassMembership(user.id, classId);
    assertOwner(user, cls.teacherId, membership.roleInClass);
    const startsAt = new Date(input.startsAt);
    if (!Number.isFinite(startsAt.getTime()) || startsAt.getTime() <= Date.now()) {
      throw new HttpError(400, "Exam start time must be in the future", "INVALID_STARTS_AT");
    }
    return Exam.create({
      classId: cls._id,
      title: input.title,
      startsAt,
      durationMinutes: input.durationMinutes,
      room: input.room,
      note: input.note,
      createdBy: user.id,
    });
  }

  static async deleteExam(user: AuthUser, classId: string, examId: string) {
    const { cls, membership } = await assertClassMembership(user.id, classId);
    assertOwner(user, cls.teacherId, membership.roleInClass);
    assertId(examId);
    const removed = await Exam.findOneAndDelete({ _id: examId, classId });
    if (!removed) throw new HttpError(404, "Exam not found in this class", "EXAM_NOT_FOUND");
    return { message: "Exam deleted successfully" };
  }
}
