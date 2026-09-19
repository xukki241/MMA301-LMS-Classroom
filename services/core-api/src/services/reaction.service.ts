import mongoose from "mongoose";
import { HttpError } from "../lib/httpError.js";
import { ClassModel, ClassMember, Post, Reaction } from "../models/index.js";

export class ReactionService {
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
   * Thả cảm xúc / Đổi cảm xúc / Bỏ cảm xúc (Toggle reaction)
   */
  static async toggleReaction(userId: string, classId: string, postId: string, emoji: string) {
    await this.assertMemberAndPost(userId, classId, postId);

    const existing = await Reaction.findOne({ postId, userId });

    if (existing) {
      if (existing.emoji === emoji) {
        // Cùng emoji -> Bỏ reaction
        await Reaction.deleteOne({ _id: existing._id });
        return {
          action: "removed",
          message: "Đã hủy biểu cảm",
          emoji,
        };
      }

      // Khác emoji -> Cập nhật sang emoji mới
      existing.emoji = emoji;
      await existing.save();
      return {
        action: "changed",
        message: "Đã thay đổi biểu cảm",
        reaction: existing,
      };
    }

    // Chưa có reaction -> Tạo mới
    const reaction = await Reaction.create({
      postId,
      userId,
      emoji,
    });

    return {
      action: "added",
      message: "Đã thêm biểu cảm",
      reaction,
    };
  }

  /**
   * Lấy danh sách tổng hợp biểu cảm của bài đăng
   */
  static async getReactions(userId: string, classId: string, postId: string) {
    await this.assertMemberAndPost(userId, classId, postId);

    const reactions = await Reaction.find({ postId });

    const countMap: Record<string, number> = {};
    let userReaction: string | null = null;

    for (const r of reactions) {
      countMap[r.emoji] = (countMap[r.emoji] || 0) + 1;
      if (r.userId === userId) {
        userReaction = r.emoji;
      }
    }

    const summary = Object.entries(countMap).map(([emoji, count]) => ({
      emoji,
      count,
    }));

    return {
      postId,
      total: reactions.length,
      summary,
      userReaction,
    };
  }
}
