import mongoose, { Schema } from "mongoose";

const classFileSchema = new Schema(
  {
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true, index: true },
    uploadedBy: { type: String, required: true },
    uploaderDisplayName: { type: String, default: "" },
    purpose: {
      type: String,
      enum: ["material", "exercise", "submission", "other"],
      default: "other",
    },
    publicId: { type: String, required: true },
    url: { type: String, required: true },
    secureUrl: { type: String, required: true },
    resourceType: { type: String, default: "raw" },
    format: { type: String, default: "" },
    bytes: { type: Number, default: 0 },
    originalFilename: { type: String, default: "" },
    mimeType: { type: String, default: "" },
  },
  { timestamps: true }
);

classFileSchema.index({ classId: 1, createdAt: -1 });
classFileSchema.index({ publicId: 1 }, { unique: true });

export const ClassFile = mongoose.model("ClassFile", classFileSchema);
