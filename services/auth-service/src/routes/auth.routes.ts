import { Router } from "express";
import { z } from "zod";
import { asyncHandler, HttpError } from "../lib/httpError.js";
import { USER_ROLES } from "../models/User.js";
import { login, register } from "../services/auth.service.js";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  displayName: z.string().min(2).max(80),
  role: z.enum(USER_ROLES),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, "Invalid register payload", "VALIDATION_ERROR");
    }
    const result = await register(parsed.data);
    res.status(201).json(result);
  })
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, "Invalid login payload", "VALIDATION_ERROR");
    }
    const result = await login(parsed.data);
    res.json(result);
  })
);
