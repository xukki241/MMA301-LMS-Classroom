import mongoose from "mongoose";
import { HttpError } from "../lib/httpError.js";
import { assertClassMembership } from "../lib/classGuards.js";
import { Post } from "../models/index.js";

export class PostService {
  /**
   * Create a new post in class (Teacher only)
   */
  static async createPost(userId: string, classId: string, content: string) {
    const { membership } = await assertClassMembership(userId, classId);

    if (membership.roleInClass !== "teacher") {
      throw new HttpError(403, "Only teachers can create posts", "FORBIDDEN");
    }

    const post = await Post.create({
      classId,
      authorId: userId,
      content,
      isDeleted: false,
    });

    return post;
  }

  /**
   * List posts in class (Supports realtime long-polling via updatedAfter)
   */
  static async listPosts(userId: string, classId: string, updatedAfter?: string) {
    await assertClassMembership(userId, classId);

    const filter: Record<string, unknown> = {
      classId,
      isDeleted: false,
    };

    if (updatedAfter) {
      const date = new Date(updatedAfter);
      if (isNaN(date.getTime())) {
        throw new HttpError(400, "updatedAfter must be a valid ISO date string", "INVALID_QUERY");
      }
      filter.updatedAt = { $gt: date };
    }

    const posts = await Post.find(filter).sort({ createdAt: -1 });
    return posts;
  }

  /**
   * Edit post (Author only)
   */
  static async updatePost(userId: string, classId: string, postId: string, content: string) {
    await assertClassMembership(userId, classId);

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      throw new HttpError(400, "Invalid post ID format", "INVALID_ID");
    }

    const post = await Post.findOne({ _id: postId, classId, isDeleted: false });
    if (!post) {
      throw new HttpError(404, "Post not found!", "POST_NOT_FOUND");
    }

    if (post.authorId !== userId) {
      throw new HttpError(403, "Only the post author can edit this post!", "FORBIDDEN");
    }

    post.content = content;
    await post.save();

    return post;
  }

  /**
   * Delete post (Soft delete - Post author or Class teacher)
   */
  static async deletePost(userId: string, classId: string, postId: string) {
    const { membership } = await assertClassMembership(userId, classId);

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      throw new HttpError(400, "Invalid post ID format!", "INVALID_ID");
    }

    const post = await Post.findOne({ _id: postId, classId, isDeleted: false });
    if (!post) {
      throw new HttpError(404, "Post not found!", "POST_NOT_FOUND");
    }

    const isAuthor = post.authorId === userId;
    const isTeacher = membership.roleInClass === "teacher";

    if (!isAuthor && !isTeacher) {
      throw new HttpError(403, "You do not have permission to delete this post!", "FORBIDDEN");
    }

    post.isDeleted = true;
    post.deletedAt = new Date();
    await post.save();

    return { message: "Post deleted successfully!" };
  }
}
