import { Router } from "express";
import { asyncHandler } from "../lib/httpError.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { OverviewService } from "../services/overview.service.js";

export const meRouter = Router();

meRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

meRouter.get(
  "/me/overview",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.status(200).json(await OverviewService.getOverview(req.user!));
  })
);
