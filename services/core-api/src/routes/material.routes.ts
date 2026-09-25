import { Router } from "express";
import { MaterialController } from "../controllers/material.controller.js";
import { asyncHandler } from "../lib/httpError.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const materialRouter = Router({ mergeParams: true });

// Matches both when mounted directly on app or under /classes
materialRouter.get("/classes/:classId/materials", requireAuth, asyncHandler(MaterialController.listMaterials));
materialRouter.post("/classes/:classId/materials", requireAuth, asyncHandler(MaterialController.createMaterial));
materialRouter.delete("/classes/:classId/materials/:materialId", requireAuth, asyncHandler(MaterialController.deleteMaterial));

materialRouter.get("/:classId/materials", requireAuth, asyncHandler(MaterialController.listMaterials));
materialRouter.post("/:classId/materials", requireAuth, asyncHandler(MaterialController.createMaterial));
materialRouter.delete("/:classId/materials/:materialId", requireAuth, asyncHandler(MaterialController.deleteMaterial));
