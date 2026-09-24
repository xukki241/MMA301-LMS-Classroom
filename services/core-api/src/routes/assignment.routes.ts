import { Router } from "express";
import { AssignmentController } from "../controllers/assignment.controller.js";
import { asyncHandler } from "../lib/httpError.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const assignmentRouter = Router();

assignmentRouter.get("/classes/:classId/assignments", requireAuth, asyncHandler(AssignmentController.listAssignments));
assignmentRouter.post("/classes/:classId/assignments", requireAuth, asyncHandler(AssignmentController.createAssignment));
assignmentRouter.delete(
  "/classes/:classId/assignments/:assignmentId",
  requireAuth,
  asyncHandler(AssignmentController.deleteAssignment)
);
