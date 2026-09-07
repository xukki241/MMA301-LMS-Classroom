import mongoose, { Schema } from "mongoose";

const classSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    teacherId: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

classSchema.index({ teacherId: 1, createdAt: -1 });

export const ClassModel = mongoose.model("Class", classSchema);
