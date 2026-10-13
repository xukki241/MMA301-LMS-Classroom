import { Router } from "express";
import { CalendarController } from "../controllers/calendar.controller.js";
import { asyncHandler } from "../lib/httpError.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const calendarRouter = Router();

calendarRouter.get(
  "/calendar/events",
  requireAuth,
  asyncHandler(CalendarController.listEvents)
);
