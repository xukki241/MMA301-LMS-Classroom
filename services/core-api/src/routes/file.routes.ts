import { Router } from "express";
import { FileController } from "../controllers/file.controller.js";
import { asyncHandler } from "../lib/httpError.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const fileRouter = Router();

fileRouter.get("/uploads/cloudinary/status", requireAuth, asyncHandler(FileController.status));
fileRouter.get("/classes/:classId/files", requireAuth, asyncHandler(FileController.list));
fileRouter.post("/classes/:classId/files", requireAuth, asyncHandler(FileController.upload));
fileRouter.delete("/classes/:classId/files/:fileId", requireAuth, asyncHandler(FileController.remove));
