import mongoose from "mongoose";
import { HttpError } from "../lib/httpError.js";
import { ClassModel, ClassMember, Post, Comment } from "../models/index.js";

export class CommentService {
  /**
   * Helper kiểm tra thành viên lớp và sự tồn tại của bài đăng
   */
  private static async assertMemberAndPost(userId: string, classId: string, postId: string) {
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      throw new HttpError(400, "Định dạng ID lớp học không hợp lệ", "INVALID_ID");
    }

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      throw new HttpError(400, "Định dạng ID bài đăng không hợp lệ", "INVALID_ID");
    }

    const cls = await ClassModel.findById(classId);
    if (!cls) {
      throw new HttpError(404, "Không tìm thấy lớp học", "CLASS_NOT_FOUND");
    }

    const membership = await ClassMember.findOne({ classId, userId });
    if (!membership) {
      throw new HttpError(403, "Bạn không phải là thành viên của lớp học này", "FORBIDDEN");
    }

    const post = await Post.findOne({ _id: postId, classId, isDeleted: false });
    if (!post) {
      throw new HttpError(404, "Không tìm thấy bài đăng trong lớp học", "POST_NOT_FOUND");
    }

    return { cls, membership, post };
  }

  /**
   * Tạo bình luận mới trên bài đăng (Mọi thành viên trong lớp)
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
   * Lấy danh sách bình luận của bài đăng
   */
  static async listComments(userId: string, classId: string, postId: string) {
    await this.assertMemberAndPost(userId, classId, postId);

    const comments = await Comment.find({ postId, isDeleted: false }).sort({ createdAt: 1 });
    return comments;
  }

  /**
   * Chỉnh sửa bình luận (Chỉ tác giả - Author)
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
      throw new HttpError(400, "Định dạng ID bình luận không hợp lệ", "INVALID_ID");
    }

    const comment = await Comment.findOne({ _id: commentId, postId, isDeleted: false });
    if (!comment) {
      throw new HttpError(404, "Không tìm thấy bình luận", "COMMENT_NOT_FOUND");
    }

    if (comment.authorId !== userId) {
      throw new HttpError(403, "Chỉ tác giả mới có thể chỉnh sửa bình luận này", "FORBIDDEN");
    }

    comment.content = content;
    await comment.save();

    return comment;
  }

  /**
   * Xóa bình luận (Soft delete - Tác giả hoặc Giáo viên của lớp)
   */
  static async deleteComment(
    userId: string,
    classId: string,
    postId: string,
    commentId: string
  ) {
    const { membership } = await this.assertMemberAndPost(userId, classId, postId);

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      throw new HttpError(400, "Định dạng ID bình luận không hợp lệ", "INVALID_ID");
    }

    const comment = await Comment.findOne({ _id: commentId, postId, isDeleted: false });
    if (!comment) {
      throw new HttpError(404, "Không tìm thấy bình luận", "COMMENT_NOT_FOUND");
    }

    const isAuthor = comment.authorId === userId;
    const isTeacher = membership.roleInClass === "teacher";

    if (!isAuthor && !isTeacher) {
      throw new HttpError(403, "Bạn không có quyền xóa bình luận này", "FORBIDDEN");
    }

    comment.isDeleted = true;
    comment.deletedAt = new Date();
    await comment.save();

    return { message: "Xóa bình luận thành công" };
  }
}
