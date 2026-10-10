import mongoose, { Schema } from "mongoose";

export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "todo" | "in_progress" | "completed";

export interface ITask {
  _id: mongoose.Types.ObjectId;
  userId: string;
  classId?: mongoose.Types.ObjectId;
  exerciseId?: mongoose.Types.ObjectId;
  title: string;
  description: string;
  dueDate?: Date;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: "Class" },
    exerciseId: { type: Schema.Types.ObjectId, ref: "Exercise" },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    dueDate: { type: Date },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["todo", "in_progress", "completed"],
      default: "todo",
    },
  },
  { timestamps: true }
);

taskSchema.index({ userId: 1, status: 1, dueDate: 1 });
taskSchema.index({ userId: 1, createdAt: -1 });

export const Task = mongoose.model<ITask>("Task", taskSchema);
