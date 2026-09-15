import type { Request, Response } from "express";
import { z } from "zod";
import { HttpError } from "../lib/httpError.js";
import { ClassService } from "../services/class.service.js";

const createClassSchema = z.object({
  name: z
    .string({ required_error: "Vui lòng nhập tên lớp học" })
    .trim()
    .min(1, "Tên lớp học không được để trống")
    .max(100, "Tên lớp học không được vượt quá 100 ký tự"),
});

const joinClassSchema = z.object({
  code: z
    .string({ required_error: "Vui lòng nhập mã lớp học" })
    .trim()
    .length(6, "Mã lớp học phải có đúng 6 ký tự")
    .transform((val) => val.toUpperCase()),
});

const updateClassSchema = z.object({
  name: z
    .string({ required_error: "Vui lòng nhập tên lớp học" })
    .trim()
    .min(1, "Tên lớp học không được để trống")
    .max(100, "Tên lớp học không được vượt quá 100 ký tự"),
});

function parseBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const message = result.error.errors.map((e) => e.message).join(", ");
    throw new HttpError(422, message, "VALIDATION_ERROR");
  }
  return result.data;
}

export class ClassController {
  /**
   * POST /classes
   * Teacher creates a class
   */
  static async createClass(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    if (user.role !== "teacher") {
      throw new HttpError(403, "Chỉ giáo viên mới có thể tạo lớp học", "FORBIDDEN");
    }

    const { name } = parseBody(createClassSchema, req.body);
    const newClass = await ClassService.createClass(user.id, name);

    res.status(201).json({
      message: "Tạo lớp học thành công",
      class: newClass,
    });
  }

  /**
   * GET /classes/teaching
   * Teacher lists their created classes
   */
  static async getTeachingClasses(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    if (user.role !== "teacher") {
      throw new HttpError(403, "Chỉ giáo viên mới có thể xem danh sách lớp đang giảng dạy", "FORBIDDEN");
    }

    const classes = await ClassService.getTeachingClasses(user.id);
    res.status(200).json({ classes });
  }

  /**
   * GET /classes/enrolled
   * Student lists their enrolled classes
   */
  static async getEnrolledClasses(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    if (user.role !== "student") {
      throw new HttpError(403, "Chỉ học sinh mới có thể xem danh sách lớp đã tham gia", "FORBIDDEN");
    }

    const classes = await ClassService.getEnrolledClasses(user.id);
    res.status(200).json({ classes });
  }

  /**
   * POST /classes/join
   * Student joins a class by code
   */
  static async joinClass(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    if (user.role !== "student") {
      throw new HttpError(403, "Chỉ học sinh mới có thể tham gia lớp học", "FORBIDDEN");
    }

    const { code } = parseBody(joinClassSchema, req.body);
    const result = await ClassService.joinClass(user.id, code);

    res.status(200).json({
      message: "Tham gia lớp học thành công",
      ...result,
    });
  }

  /**
   * GET /classes/:id
   * Member views class details
   */
  static async getClassDetails(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const classId = req.params.id;

    const result = await ClassService.getClassDetails(user.id, classId);
    res.status(200).json(result);
  }

  /**
   * GET /classes/:id/members
   * Member views list of class members
   */
  static async getClassMembers(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const classId = req.params.id;

    const members = await ClassService.getClassMembers(user.id, classId);
    res.status(200).json({ members });
  }

  /**
   * PATCH /classes/:id
   * Teacher owner updates class name
   */
  static async updateClass(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    if (user.role !== "teacher") {
      throw new HttpError(403, "Chỉ giáo viên mới có thể cập nhật lớp học", "FORBIDDEN");
    }

    const classId = req.params.id;
    const { name } = parseBody(updateClassSchema, req.body);

    const updatedClass = await ClassService.updateClass(user.id, classId, name);

    res.status(200).json({
      message: "Cập nhật lớp học thành công",
      class: updatedClass,
    });
  }

  /**
   * DELETE /classes/:id
   * Teacher owner deletes class
   */
  static async deleteClass(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    if (user.role !== "teacher") {
      throw new HttpError(403, "Chỉ giáo viên mới có thể xóa lớp học", "FORBIDDEN");
    }

    const classId = req.params.id;
    const result = await ClassService.deleteClass(user.id, classId);

    res.status(200).json(result);
  }
}
