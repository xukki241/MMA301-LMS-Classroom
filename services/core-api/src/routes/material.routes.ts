import { Router } from "express";
import { MaterialController } from "../controllers/material.controller.js";
import { asyncHandler } from "../lib/httpError.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const materialRouter = Router();

// Routes support both :classId and :id naming for maximum compatibility
materialRouter.get("/classes/:classId/materials", requireAuth, asyncHandler(MaterialController.listMaterials));
materialRouter.post("/classes/:classId/materials", requireAuth, asyncHandler(MaterialController.createMaterial));
materialRouter.delete("/classes/:classId/materials/:materialId", requireAuth, asyncHandler(MaterialController.deleteMaterial));
