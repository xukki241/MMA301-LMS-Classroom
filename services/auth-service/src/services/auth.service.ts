import bcrypt from "bcryptjs";
import { HttpError } from "../lib/httpError.js";
import { signAccessToken } from "../lib/jwt.js";
import { User, type UserRole } from "../models/User.js";
import { Otp } from "../models/Otp.js";
import { sendOtpEmail } from "./email.service.js";

const SALT_ROUNDS = 12;

export interface AuthResponse {
  token: string;
  user: { id: string; email: string; displayName: string; role: UserRole };
}

function toAuthResponse(user: {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
}): AuthResponse {
  return {
    token: signAccessToken({ sub: user.id, email: user.email, role: user.role }),
    user,
  };
}

export async function sendOtp(rawEmail: string): Promise<void> {
  const email = rawEmail.toLowerCase().trim();
  const existing = await User.findOne({ email });
  if (existing) {
    throw new HttpError(409, "Email này đã được đăng ký tài khoản", "EMAIL_TAKEN");
  }

  // Tạo mã OTP 6 số ngẫu nhiên
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

  await Otp.deleteMany({ email });
  await Otp.create({ email, code, expiresAt });

  await sendOtpEmail(email, code);
}

export async function verifyOtp(rawEmail: string, code: string): Promise<boolean> {
  const email = rawEmail.toLowerCase().trim();
  const otp = await Otp.findOne({ email, code: code.trim(), expiresAt: { $gt: new Date() } });
  if (!otp) {
    throw new HttpError(400, "Mã xác thực không đúng hoặc đã hết hạn", "INVALID_OTP");
  }
  return true;
}

export async function register(input: {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  otpCode?: string;
}): Promise<AuthResponse> {
  const email = input.email.toLowerCase().trim();
  const existing = await User.findOne({ email });
  if (existing) {
    throw new HttpError(409, "Email already registered", "EMAIL_TAKEN");
  }

  // Nếu có mã OTP đi kèm, kiểm tra xác thực
  if (input.otpCode) {
    const otp = await Otp.findOne({
      email,
      code: input.otpCode.trim(),
      expiresAt: { $gt: new Date() },
    });
    if (!otp) {
      throw new HttpError(400, "Mã xác thực OTP không chính xác hoặc đã hết hạn", "INVALID_OTP");
    }
    await Otp.deleteMany({ email });
  }

  const user = await User.create({
    email,
    passwordHash: await bcrypt.hash(input.password, SALT_ROUNDS),
    displayName: input.displayName.trim(),
    role: input.role,
    authProvider: "local",
  });

  return toAuthResponse({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  });
}

export async function googleAuth(input: {
  email: string;
  displayName: string;
  googleId?: string;
  role?: UserRole;
}): Promise<AuthResponse> {
  const email = input.email.toLowerCase().trim();
  let user = await User.findOne({ email });

  if (!user) {
    // Tự động đăng ký tài khoản mới khi đăng nhập Google lần đầu
    user = await User.create({
      email,
      displayName: input.displayName.trim() || email.split("@")[0],
      role: input.role ?? "student",
      googleId: input.googleId,
      authProvider: "google",
    });
  }

  return toAuthResponse({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  });
}

export async function login(input: { email: string; password: string }): Promise<AuthResponse> {
  const email = input.email.toLowerCase().trim();
  const user = await User.findOne({ email });
  if (!user) {
    throw new HttpError(401, "Email hoặc mật khẩu không đúng", "INVALID_CREDENTIALS");
  }

  if (!user.passwordHash) {
    throw new HttpError(
      400,
      "Tài khoản này được đăng ký thông qua Google. Vui lòng chọn 'Đăng nhập bằng Google'.",
      "AUTH_METHOD_MISMATCH"
    );
  }

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) {
    throw new HttpError(401, "Email hoặc mật khẩu không đúng", "INVALID_CREDENTIALS");
  }

  return toAuthResponse({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  });
}
