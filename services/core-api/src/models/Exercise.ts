import mongoose, { Schema } from "mongoose";

const exerciseSchema = new Schema(
  {
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    dueAt: { type: Date, required: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

exerciseSchema.index({ classId: 1, dueAt: 1 });

export const Exercise = mongoose.model("Exercise", exerciseSchema);
