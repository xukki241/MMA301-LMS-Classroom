import mongoose, { Schema } from "mongoose";

const materialUnlockSchema = new Schema(
  {
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    materialId: { type: Schema.Types.ObjectId, ref: "Material", required: true },
    userId: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    provider: { type: String, enum: ["SEPAY", "SEPAY_DEMO"], required: true },
    providerRef: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

materialUnlockSchema.index({ materialId: 1, userId: 1 }, { unique: true });
materialUnlockSchema.index({ providerRef: 1 }, { unique: true });

export const MaterialUnlock = mongoose.model("MaterialUnlock", materialUnlockSchema);
