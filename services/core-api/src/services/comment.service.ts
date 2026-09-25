import mongoose from "mongoose";
import { HttpError } from "../lib/httpError.js";
import { assertClassMembership } from "../lib/classGuards.js";
import { Post, Comment } from "../models/index.js";

export class CommentService {
  /**
   * Helper to verify class membership and post existence
   */
  private static async assertMemberAndPost(userId: string, classId: string, postId: string) {
    const { cls, membership } = await assertClassMembership(userId, classId);

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      throw new HttpError(400, "Invalid post ID format", "INVALID_ID");
    }

    const post = await Post.findOne({ _id: postId, classId, isDeleted: false });
    if (!post) {
      throw new HttpError(404, "Post not found in this class", "POST_NOT_FOUND");
    }

    return { cls, membership, post };
  }

  /**
   * Create a new comment on a post (Any class member)
   */
  static async createComment(userId: string, classId: string, postId: string, content: string) {
    await this.assertMemberAndPost(userId, classId, postId);

    const comment = await Comment.create({
      postId,
      authorId: userId,
      content,
      isDeleted: false,
    });

    return comment;
  }

  /**
   * Get comments of a post
   */
  static async listComments(userId: string, classId: string, postId: string) {
    await this.assertMemberAndPost(userId, classId, postId);

    const comments = await Comment.find({ postId, isDeleted: false }).sort({ createdAt: 1 });
    return comments;
  }

  /**
   * Edit comment (Comment author only)
   */
  static async updateComment(
    userId: string,
    classId: string,
    postId: string,
    commentId: string,
    content: string
  ) {
    await this.assertMemberAndPost(userId, classId, postId);

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      throw new HttpError(400, "Invalid comment ID format", "INVALID_ID");
    }

    const comment = await Comment.findOne({ _id: commentId, postId, isDeleted: false });
    if (!comment) {
      throw new HttpError(404, "Comment not found", "COMMENT_NOT_FOUND");
    }

    if (comment.authorId !== userId) {
      throw new HttpError(403, "Only the comment author can edit this comment", "FORBIDDEN");
    }

    comment.content = content;
    await comment.save();

    return comment;
  }

  /**
   * Delete comment (Soft delete - Comment author or Class teacher)
   */
  static async deleteComment(
    userId: string,
    classId: string,
    postId: string,
    commentId: string
  ) {
    const { membership } = await this.assertMemberAndPost(userId, classId, postId);

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      throw new HttpError(400, "Invalid comment ID format", "INVALID_ID");
    }

    const comment = await Comment.findOne({ _id: commentId, postId, isDeleted: false });
    if (!comment) {
      throw new HttpError(404, "Comment not found", "COMMENT_NOT_FOUND");
    }

    const isAuthor = comment.authorId === userId;
    const isTeacher = membership.roleInClass === "teacher";

    if (!isAuthor && !isTeacher) {
      throw new HttpError(403, "You do not have permission to delete this comment", "FORBIDDEN");
    }

    comment.isDeleted = true;
    comment.deletedAt = new Date();
    await comment.save();

    return { message: "Comment deleted successfully" };
  }
}
