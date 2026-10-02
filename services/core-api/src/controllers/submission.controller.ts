import type { Request, Response } from "express";
import { z } from "zod";
import { HttpError } from "../lib/httpError.js";
import { SubmissionService } from "../services/submission.service.js";

const submissionSchema = z.object({
  content: z.string().trim().max(10000).default(""),
  url: z.string().trim().max(2048).refine(value => {
    if (value === "") return true;
    try { return ["http:", "https:"].includes(new URL(value).protocol); }
    catch { return false; }
  }, "URL must use HTTP or HTTPS").default(""),
}).strict().refine(value => value.content !== "" || value.url !== "", "Submission content or URL is required");

const gradeSchema = z.object({
  score: z.number().finite().min(0).max(10),
  feedback: z.string().max(10000).default(""),
}).strict();

export class SubmissionController {
  static async putGrade(req: Request, res: Response): Promise<void> {
    const parsed = gradeSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(422, parsed.error.errors.map(e => e.message).join(", "), "VALIDATION_ERROR");
    const grade = await SubmissionService.putGrade(req.user!, req.params.classId, req.params.exerciseId, req.params.submissionId, parsed.data);
    res.status(200).json({ grade });
  }

  static async getMine(req: Request, res: Response): Promise<void> {
    const result = await SubmissionService.getMySubmission(req.user!, req.params.classId, req.params.exerciseId);
    res.status(200).json(result);
  }

  static async getOne(req: Request, res: Response): Promise<void> {
    const result = await SubmissionService.getSubmission(req.user!, req.params.classId, req.params.exerciseId, req.params.submissionId);
    res.status(200).json(result);
  }

  static async list(req: Request, res: Response): Promise<void> {
    const submissions = await SubmissionService.listSubmissions(req.user!, req.params.classId, req.params.exerciseId);
    res.status(200).json({ submissions });
  }

  static async create(req: Request, res: Response): Promise<void> {
    const parsed = submissionSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(422, parsed.error.errors.map(e => e.message).join(", "), "VALIDATION_ERROR");
    const submission = await SubmissionService.createSubmission(req.user!, req.params.classId, req.params.exerciseId, parsed.data);
    res.status(201).json({ submission });
  }

  static async updateMine(req: Request, res: Response): Promise<void> {
    const parsed = submissionSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(422, parsed.error.errors.map(e => e.message).join(", "), "VALIDATION_ERROR");
    const submission = await SubmissionService.updateMySubmission(req.user!, req.params.classId, req.params.exerciseId, parsed.data);
    res.status(200).json({ submission });
  }
}
