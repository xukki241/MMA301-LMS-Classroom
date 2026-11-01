import mongoose, { Schema } from "mongoose";

/** Kỳ kiểm tra của lớp: một mốc thời gian trên lịch, khác với bài tập (hạn nộp). */
const examSchema = new Schema(
  {
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    title: { type: String, required: true, trim: true },
    startsAt: { type: Date, required: true },
    durationMinutes: { type: Number, required: true, min: 1, max: 600 },
    room: { type: String, default: "", trim: true },
    note: { type: String, default: "", trim: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

examSchema.index({ classId: 1, startsAt: 1 });

export const Exam = mongoose.model("Exam", examSchema);
