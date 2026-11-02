import mongoose, { Schema } from "mongoose";

const classSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    teacherId: { type: String, required: true, index: true },
    /** 0 = lớp miễn phí. Có phí thì từ 5.000đ. */
    joinFeeVnd: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

classSchema.index({ teacherId: 1, createdAt: -1 });

export const ClassModel = mongoose.model("Class", classSchema);
