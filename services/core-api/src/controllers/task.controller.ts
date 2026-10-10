import type { Request, Response } from "express";
import { TaskService } from "../services/task.service.js";

export class TaskController {
  static async listTasks(req: Request, res: Response): Promise<void> {
    const tasks = await TaskService.listTasks(req.user!, {
      status: typeof req.query.status === "string" ? req.query.status : undefined,
      priority: typeof req.query.priority === "string" ? req.query.priority : undefined,
      classId: typeof req.query.classId === "string" ? req.query.classId : undefined,
      overdue: req.query.overdue === "true",
    });

    res.status(200).json({
      success: true,
      tasks,
    });
  }

  static async getTask(req: Request, res: Response): Promise<void> {
    const task = await TaskService.getTaskById(req.user!, req.params.id);
    res.status(200).json({
      success: true,
      task,
    });
  }

  static async createTask(req: Request, res: Response): Promise<void> {
    const task = await TaskService.createTask(req.user!, req.body);
    res.status(201).json({
      success: true,
      message: "Tạo công việc thành công",
      task,
    });
  }

  static async updateTask(req: Request, res: Response): Promise<void> {
    const task = await TaskService.updateTask(req.user!, req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: "Cập nhật công việc thành công",
      task,
    });
  }

  static async toggleTask(req: Request, res: Response): Promise<void> {
    const task = await TaskService.toggleTaskStatus(req.user!, req.params.id);
    res.status(200).json({
      success: true,
      message: task.status === "completed" ? "Đã hoàn thành công việc" : "Đã chuyển về chưa hoàn thành",
      task,
    });
  }

  static async deleteTask(req: Request, res: Response): Promise<void> {
    const result = await TaskService.deleteTask(req.user!, req.params.id);
    res.status(200).json(result);
  }
}
