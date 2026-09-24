import type { Request, Response } from "express";
import { AssignmentService } from "../services/assignment.service.js";

export class AssignmentController {
  static async listAssignments(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const { classId } = req.params;
    const assignments = await AssignmentService.getAssignments(user.id, classId);
    res.json({ assignments });
  }

  static async createAssignment(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const { classId } = req.params;
    const assignment = await AssignmentService.createAssignment(user.id, user.role, classId, req.body);
    res.status(201).json({ message: "Thêm bài tập thành công", assignment });
  }

  static async deleteAssignment(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const { classId, assignmentId } = req.params;
    const result = await AssignmentService.deleteAssignment(user.id, user.role, classId, assignmentId);
    res.json(result);
  }
}
