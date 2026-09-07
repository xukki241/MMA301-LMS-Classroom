import mongoose, { Schema } from "mongoose";

const gradeSchema = new Schema(
  {
    submissionId: { type: Schema.Types.ObjectId, ref: "Submission", required: true, unique: true },
    score: { type: Number, required: true, min: 0, max: 10 },
    feedback: { type: String, default: "" },
    gradedBy: { type: String, required: true },
    gradedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Grade = mongoose.model("Grade", gradeSchema);
