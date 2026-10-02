import mongoose from "mongoose";
import { HttpError } from "../lib/httpError.js";
import { assertClassMembership } from "../lib/classGuards.js";
import { Post, Reaction } from "../models/index.js";

export class ReactionService {
  /**
   * Helper to verify class membership and post existence
   */
  private static async assertMemberAndPost(userId: string, classId: string, postId: string) {
    const { cls, membership } = await assertClassMembership(userId, classId);

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      throw new HttpError(400, "Invalid post ID format!", "INVALID_ID");
    }

    const post = await Post.findOne({ _id: postId, classId, isDeleted: false });
    if (!post) {
      throw new HttpError(404, "Post not found in this class!", "POST_NOT_FOUND");
    }

    return { cls, membership, post };
  }

  /**
   * Toggle reaction on post (Add / Update / Remove)
   */
  static async toggleReaction(userId: string, classId: string, postId: string, emoji: string) {
    await this.assertMemberAndPost(userId, classId, postId);

    const existing = await Reaction.findOne({ postId, userId });

    if (existing) {
      if (existing.emoji === emoji) {
        // Same emoji -> Remove reaction
        await Reaction.deleteOne({ _id: existing._id });
        return {
          action: "removed",
          message: "Reaction removed",
          emoji,
        };
      }

      // Different emoji -> Update to new emoji
      existing.emoji = emoji;
      await existing.save();
      return {
        action: "changed",
        message: "Reaction updated",
        reaction: existing,
      };
    }

    // No reaction yet -> Create new
    const reaction = await Reaction.create({
      postId,
      userId,
      emoji,
    });

    return {
      action: "added",
      message: "Reaction added",
      reaction,
    };
  }

  /**
   * Get reactions summary of a post
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
