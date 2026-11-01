import { Router } from "express";
import { ScheduleController } from "../controllers/schedule.controller.js";
import { asyncHandler } from "../lib/httpError.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";

export const scheduleRouter = Router();

scheduleRouter.get("/classes/:classId/sessions", requireAuth, asyncHandler(ScheduleController.listSessions));
scheduleRouter.post("/classes/:classId/sessions", requireAuth, requireRole("teacher"), asyncHandler(ScheduleController.createSession));
scheduleRouter.delete("/classes/:classId/sessions/:sessionId", requireAuth, requireRole("teacher"), asyncHandler(ScheduleController.deleteSession));

scheduleRouter.get("/classes/:classId/exams", requireAuth, asyncHandler(ScheduleController.listExams));
scheduleRouter.post("/classes/:classId/exams", requireAuth, requireRole("teacher"), asyncHandler(ScheduleController.createExam));
scheduleRouter.delete("/classes/:classId/exams/:examId", requireAuth, requireRole("teacher"), asyncHandler(ScheduleController.deleteExam));
