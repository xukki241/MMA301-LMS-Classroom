import { Router } from "express";
import { SubmissionController } from "../controllers/submission.controller.js";
import { asyncHandler } from "../lib/httpError.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const submissionRouter = Router();
const base = "/classes/:classId/exercises/:exerciseId/submissions";

submissionRouter.post(base, requireAuth, asyncHandler(SubmissionController.create));
submissionRouter.put(`${base}/mine`, requireAuth, asyncHandler(SubmissionController.updateMine));
submissionRouter.get(`${base}/mine`, requireAuth, asyncHandler(SubmissionController.getMine));
submissionRouter.get(base, requireAuth, asyncHandler(SubmissionController.list));
submissionRouter.get(`${base}/:submissionId`, requireAuth, asyncHandler(SubmissionController.getOne));
submissionRouter.put(`${base}/:submissionId/grade`, requireAuth, asyncHandler(SubmissionController.putGrade));
