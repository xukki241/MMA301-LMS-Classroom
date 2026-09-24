import mongoose, { Schema } from "mongoose";

export const USER_ROLES = ["teacher", "student"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface UserDocument {
  email: string;
  passwordHash?: string;
  displayName: string;
  role: UserRole;
  googleId?: string;
  authProvider?: "local" | "google";
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: false },
    displayName: { type: String, required: true, trim: true },
    role: { type: String, required: true, enum: USER_ROLES },
    googleId: { type: String, sparse: true },
    authProvider: { type: String, enum: ["local", "google"], default: "local" },
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });

export const User = mongoose.model<UserDocument>("User", userSchema);
