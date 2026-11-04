import { Router } from "express";
import { z } from "zod";
import { asyncHandler, HttpError } from "../lib/httpError.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { USER_ROLES } from "../models/User.js";
import {
  changePassword,
  getProfile,
  login,
  register,
  updateProfile,
} from "../services/auth.service.js";

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

const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(80),
}).strict();

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72),
}).strict();

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

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await getProfile(req.user!.id);
    res.status(200).json({ user });
  })
);

authRouter.patch(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(422, "Invalid profile payload", "VALIDATION_ERROR");
    }
    const result = await updateProfile(req.user!.id, parsed.data);
    res.status(200).json(result);
  })
);

authRouter.post(
  "/change-password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(422, "Invalid change-password payload", "VALIDATION_ERROR");
    }
    const result = await changePassword(req.user!.id, parsed.data);
    res.status(200).json(result);
  })
);
