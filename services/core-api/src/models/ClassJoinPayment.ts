import mongoose, { Schema } from "mongoose";

const classJoinPaymentSchema = new Schema(
  {
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    userId: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    displayName: { type: String, default: "", trim: true },
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

classJoinPaymentSchema.index({ classId: 1, userId: 1 }, { unique: true });
classJoinPaymentSchema.index({ providerRef: 1 }, { unique: true });

export const ClassJoinPayment = mongoose.model("ClassJoinPayment", classJoinPaymentSchema);
