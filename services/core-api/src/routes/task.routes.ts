import { Router } from "express";
import { TaskController } from "../controllers/task.controller.js";
import { asyncHandler } from "../lib/httpError.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const taskRouter = Router();

taskRouter.get("/tasks", requireAuth, asyncHandler(TaskController.listTasks));
taskRouter.post("/tasks", requireAuth, asyncHandler(TaskController.createTask));
taskRouter.get("/tasks/:id", requireAuth, asyncHandler(TaskController.getTask));
taskRouter.patch("/tasks/:id", requireAuth, asyncHandler(TaskController.updateTask));
taskRouter.patch("/tasks/:id/toggle", requireAuth, asyncHandler(TaskController.toggleTask));
taskRouter.delete("/tasks/:id", requireAuth, asyncHandler(TaskController.deleteTask));
