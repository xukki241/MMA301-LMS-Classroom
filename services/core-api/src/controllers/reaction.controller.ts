import type { Request, Response } from "express";
import { z } from "zod";
import { HttpError } from "../lib/httpError.js";
import { ReactionService } from "../services/reaction.service.js";

const reactionSchema = z.object({
  emoji: z
    .string({ required_error: "Vui lòng chọn biểu cảm (emoji)" })
    .trim()
    .min(1, "Biểu cảm không được để trống")
    .max(10, "Biểu cảm không hợp lệ"),
});

function parseBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const message = result.error.errors.map((e) => e.message).join(", ");
    throw new HttpError(422, message, "VALIDATION_ERROR");
  }
  return result.data;
}

export class ReactionController {
  /**
   * POST /classes/:classId/posts/:postId/reactions
   * Member toggles/updates reaction on post
   */
  static async toggleReaction(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const { classId, postId } = req.params;
    const { emoji } = parseBody(reactionSchema, req.body);

    const result = await ReactionService.toggleReaction(user.id, classId, postId, emoji);

    const status = result.action === "added" ? 201 : 200;
    res.status(status).json(result);
  }

  /**
   * GET /classes/:classId/posts/:postId/reactions
   * Member views reactions summary on post
   */
  static async getReactions(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const { classId, postId } = req.params;

    const result = await ReactionService.getReactions(user.id, classId, postId);

    res.status(200).json(result);
  }
}
