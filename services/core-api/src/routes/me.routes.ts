import { Router } from "express";
import { PaymentController } from "../controllers/payment.controller.js";
import { SubmissionController } from "../controllers/submission.controller.js";
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

meRouter.get("/me/payments", requireAuth, asyncHandler(PaymentController.listMine));
meRouter.get("/me/submissions", requireAuth, asyncHandler(SubmissionController.listMine));
