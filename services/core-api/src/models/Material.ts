import mongoose, { Schema } from "mongoose";

const materialSchema = new Schema(
  {
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    url: { type: String, required: true, trim: true },
    /** 0 = miễn phí. >0 = học sinh phải mở khóa (SePay) trước khi xem URL. */
    priceVnd: { type: Number, default: 0, min: 0 },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

materialSchema.index({ classId: 1, createdAt: -1 });

export const Material = mongoose.model("Material", materialSchema);
