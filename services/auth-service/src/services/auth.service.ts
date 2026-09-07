import bcrypt from "bcryptjs";
import { HttpError } from "../lib/httpError.js";
import { signAccessToken } from "../lib/jwt.js";
import { User, type UserRole } from "../models/User.js";

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

export async function register(input: {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
}): Promise<AuthResponse> {
  const email = input.email.toLowerCase().trim();
  const existing = await User.findOne({ email });
  if (existing) {
    throw new HttpError(409, "Email already registered", "EMAIL_TAKEN");
  }

  const user = await User.create({
    email,
    passwordHash: await bcrypt.hash(input.password, SALT_ROUNDS),
    displayName: input.displayName.trim(),
    role: input.role,
  });

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
    throw new HttpError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) {
    throw new HttpError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  return toAuthResponse({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  });
}
