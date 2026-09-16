import { Router } from "express";
import { ClassController } from "../controllers/class.controller.js";
import { asyncHandler } from "../lib/httpError.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const classRouter = Router();

// Static paths first to avoid conflict with :id route parameter
classRouter.post("/classes", requireAuth, asyncHandler(ClassController.createClass));
classRouter.get("/classes/teaching", requireAuth, asyncHandler(ClassController.getTeachingClasses));
classRouter.get("/classes/enrolled", requireAuth, asyncHandler(ClassController.getEnrolledClasses));
classRouter.post("/classes/join", requireAuth, asyncHandler(ClassController.joinClass));

// Dynamic :id paths
classRouter.get("/classes/:id", requireAuth, asyncHandler(ClassController.getClassDetails));
classRouter.get("/classes/:id/members", requireAuth, asyncHandler(ClassController.getClassMembers));
classRouter.patch("/classes/:id", requireAuth, asyncHandler(ClassController.updateClass));
classRouter.delete("/classes/:id", requireAuth, asyncHandler(ClassController.deleteClass));
