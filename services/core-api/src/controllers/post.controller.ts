import type { Request, Response } from "express";
import { z } from "zod";
import { HttpError } from "../lib/httpError.js";
import { PostService } from "../services/post.service.js";

const postSchema = z.object({
  content: z
    .string({ required_error: "Post content is required" })
    .trim()
    .min(1, "Post content cannot be empty")
    .max(2000, "Post content must be 2000 characters or fewer"),
});

function parseBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const message = result.error.errors.map((e) => e.message).join(", ");
    throw new HttpError(422, message, "VALIDATION_ERROR");
  }
  return result.data;
}

export class PostController {
  /**
   * POST /classes/:classId/posts
   * Teacher creates a post in class
   */
  static async createPost(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const { classId } = req.params;
    const { content } = parseBody(postSchema, req.body);

    const post = await PostService.createPost(user.id, classId, content);

    res.status(201).json({
      message: "Post created successfully",
      post,
    });
  }

  /**
   * GET /classes/:classId/posts
   * Member lists posts in class (supports ?updatedAfter= for long polling)
   */
  static async listPosts(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const { classId } = req.params;
    const updatedAfter = typeof req.query.updatedAfter === "string" ? req.query.updatedAfter : undefined;

    const posts = await PostService.listPosts(user.id, classId, updatedAfter);

    res.status(200).json({ posts });
  }

  /**
   * PATCH /classes/:classId/posts/:postId
   * Author updates post
   */
  static async updatePost(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const { classId, postId } = req.params;
    const { content } = parseBody(postSchema, req.body);

    const post = await PostService.updatePost(user.id, classId, postId, content);

    res.status(200).json({
      message: "Post updated successfully",
      post,
    });
  }

  /**
   * DELETE /classes/:classId/posts/:postId
   * Author or Teacher deletes post (soft delete)
   */
  static async deletePost(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const { classId, postId } = req.params;

    const result = await PostService.deletePost(user.id, classId, postId);

    res.status(200).json(result);
  }
}
