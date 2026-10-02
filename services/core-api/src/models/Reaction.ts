import mongoose, { Schema } from "mongoose";

const reactionSchema = new Schema(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    userId: { type: String, required: true },
    emoji: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

// One reaction per user per post
reactionSchema.index({ postId: 1, userId: 1 }, { unique: true });
reactionSchema.index({ postId: 1, emoji: 1 });

export const Reaction = mongoose.model("Reaction", reactionSchema);
