import mongoose, { Schema } from "mongoose";

const postSchema = new Schema(
  {
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    authorId: { type: String, required: true },
    content: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

postSchema.index({ classId: 1, createdAt: -1 });

export const Post = mongoose.model("Post", postSchema);
