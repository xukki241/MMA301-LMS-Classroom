import mongoose, { Schema } from "mongoose";

const commentSchema = new Schema(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    authorId: { type: String, required: true },
    content: { type: String, required: true, trim: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

commentSchema.index({ postId: 1, isDeleted: 1, createdAt: 1 });

export const Comment = mongoose.model("Comment", commentSchema);
