import type { Request, Response } from "express";
import { CalendarService, type CalendarEventType } from "../services/calendar.service.js";

export class CalendarController {
  static async listEvents(req: Request, res: Response): Promise<void> {
    const result = await CalendarService.listEvents(req.user!, {
      from: typeof req.query.from === "string" ? req.query.from : undefined,
      to: typeof req.query.to === "string" ? req.query.to : undefined,
      type:
        req.query.type === "exercise" || req.query.type === "task"
          ? (req.query.type as CalendarEventType)
          : "all",
      status:
        req.query.status === "pending" ||
        req.query.status === "completed" ||
        req.query.status === "overdue"
          ? (req.query.status as any)
          : "all",
      classId: typeof req.query.classId === "string" ? req.query.classId : undefined,
    });

    res.status(200).json({
      success: true,
      events: result.events,
      summary: result.summary,
    });
  }
}
