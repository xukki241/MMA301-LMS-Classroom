import mongoose from "mongoose";
import { HttpError } from "../lib/httpError.js";
import { ClassModel, ClassMember, Post } from "../models/index.js";

export class PostService {
  /**
   * Helper kiểm tra thành viên của lớp học
   */
  private static async assertClassMember(userId: string, classId: string) {
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      throw new HttpError(400, "Định dạng ID lớp học không hợp lệ", "INVALID_ID");
    }

    const cls = await ClassModel.findById(classId);
    if (!cls) {
      throw new HttpError(404, "Không tìm thấy lớp học", "CLASS_NOT_FOUND");
    }

    const membership = await ClassMember.findOne({ classId, userId });
    if (!membership) {
      throw new HttpError(403, "Bạn không phải là thành viên của lớp học này", "FORBIDDEN");
    }

    return { cls, membership };
  }

  /**
   * Tạo bài đăng mới trong lớp (Chỉ giáo viên - Teacher)
   */
  static async createPost(userId: string, classId: string, content: string) {
    const { membership } = await this.assertClassMember(userId, classId);

    if (membership.roleInClass !== "teacher") {
      throw new HttpError(403, "Chỉ giáo viên mới có thể tạo bài đăng", "FORBIDDEN");
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
   * Lấy danh sách bài đăng trong lớp (Hỗ trợ realtime long-polling qua updatedAfter)
   */
  static async listPosts(userId: string, classId: string, updatedAfter?: string) {
    await this.assertClassMember(userId, classId);

    const filter: Record<string, unknown> = {
      classId,
      isDeleted: false,
    };

    if (updatedAfter) {
      const date = new Date(updatedAfter);
      if (isNaN(date.getTime())) {
        throw new HttpError(400, "updatedAfter không đúng định dạng thời gian ISO", "INVALID_QUERY");
      }
      filter.updatedAt = { $gt: date };
    }

    const posts = await Post.find(filter).sort({ createdAt: -1 });
    return posts;
  }

  /**
   * Chỉnh sửa bài đăng (Chỉ tác giả - Author)
   */
  static async updatePost(userId: string, classId: string, postId: string, content: string) {
    await this.assertClassMember(userId, classId);

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      throw new HttpError(400, "Định dạng ID bài đăng không hợp lệ", "INVALID_ID");
    }

    const post = await Post.findOne({ _id: postId, classId, isDeleted: false });
    if (!post) {
      throw new HttpError(404, "Không tìm thấy bài đăng", "POST_NOT_FOUND");
    }

    if (post.authorId !== userId) {
      throw new HttpError(403, "Chỉ tác giả mới có thể chỉnh sửa bài đăng này", "FORBIDDEN");
    }

    post.content = content;
    await post.save();

    return post;
  }

  /**
   * Xóa bài đăng (Soft delete - Tác giả hoặc Giáo viên của lớp)
   */
  static async deletePost(userId: string, classId: string, postId: string) {
    const { membership } = await this.assertClassMember(userId, classId);

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      throw new HttpError(400, "Định dạng ID bài đăng không hợp lệ", "INVALID_ID");
    }

    const post = await Post.findOne({ _id: postId, classId, isDeleted: false });
    if (!post) {
      throw new HttpError(404, "Không tìm thấy bài đăng", "POST_NOT_FOUND");
    }

    const isAuthor = post.authorId === userId;
    const isTeacher = membership.roleInClass === "teacher";

    if (!isAuthor && !isTeacher) {
      throw new HttpError(403, "Bạn không có quyền xóa bài đăng này", "FORBIDDEN");
    }

    post.isDeleted = true;
    post.deletedAt = new Date();
    await post.save();

    return { message: "Xóa bài đăng thành công" };
  }
}
