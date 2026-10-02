import { Router } from "express";
import { ExerciseController } from "../controllers/exercise.controller.js";
import { asyncHandler } from "../lib/httpError.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";

export const exerciseRouter = Router();

exerciseRouter.post("/classes/:classId/exercises", requireAuth, requireRole("teacher"), asyncHandler(ExerciseController.createExercise));
exerciseRouter.get("/classes/:classId/exercises", requireAuth, asyncHandler(ExerciseController.listExercises));
