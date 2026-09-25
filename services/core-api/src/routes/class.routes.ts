import { Router } from "express";
import { ClassController } from "../controllers/class.controller.js";
import { asyncHandler } from "../lib/httpError.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";

export const classRouter = Router();

// Static paths first to avoid conflict with :id route parameter
classRouter.post("/classes", requireAuth, requireRole("teacher"), asyncHandler(ClassController.createClass));
classRouter.get("/classes/teaching", requireAuth, requireRole("teacher"), asyncHandler(ClassController.getTeachingClasses));
classRouter.get("/classes/enrolled", requireAuth, requireRole("student"), asyncHandler(ClassController.getEnrolledClasses));
classRouter.post("/classes/join", requireAuth, requireRole("student"), asyncHandler(ClassController.joinClass));

// Dynamic :id paths
classRouter.get("/classes/:id", requireAuth, asyncHandler(ClassController.getClassDetails));
classRouter.get("/classes/:id/members", requireAuth, asyncHandler(ClassController.getClassMembers));
classRouter.patch("/classes/:id", requireAuth, requireRole("teacher"), asyncHandler(ClassController.updateClass));
classRouter.delete("/classes/:id", requireAuth, requireRole("teacher"), asyncHandler(ClassController.deleteClass));
