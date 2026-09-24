import { Router } from "express";
import { z } from "zod";
import { asyncHandler, HttpError } from "../lib/httpError.js";
import { USER_ROLES } from "../models/User.js";
import { googleAuth, login, register, sendOtp, verifyOtp } from "../services/auth.service.js";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  displayName: z.string().min(2).max(80),
  role: z.enum(USER_ROLES),
  otpCode: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const sendOtpSchema = z.object({
  email: z.string().email(),
});

const verifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().min(4).max(8),
});

const googleAuthSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).default("Google User"),
  googleId: z.string().optional(),
  role: z.enum(USER_ROLES).optional(),
});

// Gửi mã OTP xác thực email
authRouter.post(
  "/send-otp",
  asyncHandler(async (req, res) => {
    const parsed = sendOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, "Địa chỉ email không đúng định dạng", "VALIDATION_ERROR");
    }
    await sendOtp(parsed.data.email);
    res.json({ ok: true, message: "Mã OTP đã được gửi đến email của bạn" });
  })
);

// Xác thực mã OTP
authRouter.post(
  "/verify-otp",
  asyncHandler(async (req, res) => {
    const parsed = verifyOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, "Thông tin xác thực không hợp lệ", "VALIDATION_ERROR");
    }
    await verifyOtp(parsed.data.email, parsed.data.code);
    res.json({ ok: true, verified: true });
  })
);

// Đăng ký tài khoản
authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, "Dữ liệu đăng ký không hợp lệ", "VALIDATION_ERROR");
    }
    const result = await register(parsed.data);
    res.status(201).json(result);
  })
);

// Đăng nhập tài khoản
authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, "Dữ liệu đăng nhập không hợp lệ", "VALIDATION_ERROR");
    }
    const result = await login(parsed.data);
    res.json(result);
  })
);

// Đăng nhập / Đăng ký qua Google
authRouter.post(
  "/google",
  asyncHandler(async (req, res) => {
    const parsed = googleAuthSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, "Thông tin xác thực Google không hợp lệ", "VALIDATION_ERROR");
    }
    const result = await googleAuth(parsed.data);
    res.json(result);
  })
);
