import mongoose, { Schema } from "mongoose";

/** Buổi học lặp lại hằng tuần của một lớp (weekday: 0 = Chủ nhật … 6 = Thứ bảy). */
const classSessionSchema = new Schema(
  {
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    weekday: { type: Number, required: true, min: 0, max: 6 },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    room: { type: String, default: "", trim: true },
    note: { type: String, default: "", trim: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

classSessionSchema.index({ classId: 1, weekday: 1, startTime: 1 });

export const ClassSession = mongoose.model("ClassSession", classSessionSchema);
