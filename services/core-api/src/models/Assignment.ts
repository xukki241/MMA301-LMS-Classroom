import mongoose, { Schema } from "mongoose";

const assignmentSchema = new Schema(
  {
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    dueDate: { type: Date, default: null },
    maxScore: { type: Number, default: 100 },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

assignmentSchema.index({ classId: 1, createdAt: -1 });

export const Assignment = mongoose.model("Assignment", assignmentSchema);
