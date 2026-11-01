import mongoose, { Schema } from "mongoose";

const classMemberSchema = new Schema(
  {
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    userId: { type: String, required: true },
    roleInClass: { type: String, required: true, enum: ["teacher", "student"] },
    // Ảnh chụp tên hiển thị lấy từ JWT (Auth Service là nguồn gốc dữ liệu người dùng).
    displayName: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

classMemberSchema.index({ classId: 1, userId: 1 }, { unique: true });
classMemberSchema.index({ userId: 1 });

export const ClassMember = mongoose.model("ClassMember", classMemberSchema);
