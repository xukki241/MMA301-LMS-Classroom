// Schedule controller - class timetable and calendar event management
import type { Request, Response } from "express";
import { z } from "zod";
import { HttpError } from "../lib/httpError.js";
import { ScheduleService } from "../services/schedule.service.js";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:mm (24h)");

const sessionSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startTime: time,
  endTime: time,
  room: z.string().trim().max(60).default(""),
  note: z.string().trim().max(300).default(""),
}).strict();

const examSchema = z.object({
  title: z.string().trim().min(1).max(200),
  startsAt: z.string().datetime({ offset: true }),
  durationMinutes: z.number().int().min(1).max(600),
  room: z.string().trim().max(60).default(""),
  note: z.string().trim().max(300).default(""),
}).strict();

function parse<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new HttpError(422, result.error.errors.map((e) => e.message).join(", "), "VALIDATION_ERROR");
  }
  return result.data;
}

export class ScheduleController {
  static async listSessions(req: Request, res: Response): Promise<void> {
    const sessions = await ScheduleService.listSessions(req.user!, req.params.classId);
    res.status(200).json({ sessions });
  }

  static async createSession(req: Request, res: Response): Promise<void> {
    const input = parse(sessionSchema, req.body);
    const session = await ScheduleService.createSession(req.user!, req.params.classId, input);
    res.status(201).json({ message: "Session created successfully", session });
  }

  static async deleteSession(req: Request, res: Response): Promise<void> {
    res.status(200).json(await ScheduleService.deleteSession(req.user!, req.params.classId, req.params.sessionId));
  }

  static async listExams(req: Request, res: Response): Promise<void> {
    const exams = await ScheduleService.listExams(req.user!, req.params.classId);
    res.status(200).json({ exams });
  }

  static async createExam(req: Request, res: Response): Promise<void> {
    const input = parse(examSchema, req.body);
    const exam = await ScheduleService.createExam(req.user!, req.params.classId, input);
    res.status(201).json({ message: "Exam created successfully", exam });
  }

  static async deleteExam(req: Request, res: Response): Promise<void> {
    res.status(200).json(await ScheduleService.deleteExam(req.user!, req.params.classId, req.params.examId));
  }
}
