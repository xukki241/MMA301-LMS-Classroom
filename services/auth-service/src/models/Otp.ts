import mongoose, { Schema } from "mongoose";

export interface OtpDocument {
  email: string;
  code: string;
  expiresAt: Date;
  createdAt: Date;
}

const otpSchema = new Schema<OtpDocument>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true }
);

otpSchema.index({ email: 1 });

export const Otp = mongoose.model<OtpDocument>("Otp", otpSchema);
