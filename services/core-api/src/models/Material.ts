import mongoose, { Schema } from "mongoose";

const materialSchema = new Schema(
  {
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    url: { type: String, required: true, trim: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

materialSchema.index({ classId: 1, createdAt: -1 });

export const Material = mongoose.model("Material", materialSchema);
