import type { Request, Response } from "express";
import { z } from "zod";
import { HttpError } from "../lib/httpError.js";
import { CommentService } from "../services/comment.service.js";

const commentSchema = z.object({
  content: z
    .string({ required_error: "Comment content is required" })
    .trim()
    .min(1, "Comment content cannot be empty")
    .max(1000, "Comment content must be 1000 characters or fewer"),
});

function parseBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const message = result.error.errors.map((e) => e.message).join(", ");
    throw new HttpError(422, message, "VALIDATION_ERROR");
  }
  return result.data;
}

export class CommentController {
  /**
   * POST /classes/:classId/posts/:postId/comments
   * Member creates comment on post
   */
  static async createComment(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const { classId, postId } = req.params;
    const { content } = parseBody(commentSchema, req.body);

    const comment = await CommentService.createComment(user.id, classId, postId, content);

    res.status(201).json({
      message: "Comment created successfully",
      comment,
    });
  }

  /**
   * GET /classes/:classId/posts/:postId/comments
   * Member lists comments on post
   */
  static async listComments(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const { classId, postId } = req.params;

    const comments = await CommentService.listComments(user.id, classId, postId);

    res.status(200).json({ comments });
  }

  /**
   * PATCH /classes/:classId/posts/:postId/comments/:commentId
   * Author updates comment
   */
  static async updateComment(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const { classId, postId, commentId } = req.params;
    const { content } = parseBody(commentSchema, req.body);

    const comment = await CommentService.updateComment(user.id, classId, postId, commentId, content);

    res.status(200).json({
      message: "Comment updated successfully",
      comment,
    });
  }

  /**
   * DELETE /classes/:classId/posts/:postId/comments/:commentId
   * Author or Teacher deletes comment (soft delete)
   */
  static async deleteComment(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const { classId, postId, commentId } = req.params;

    const result = await CommentService.deleteComment(user.id, classId, postId, commentId);

    res.status(200).json(result);
  }
}
