import { AUTH_URL, CORE_URL } from "./config";
import { http } from "./http";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: "teacher" | "student";
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export async function register(
  input: {
    email: string;
    password: string;
    displayName: string;
    role: "teacher" | "student";
    otpCode?: string;
  },
  signal?: AbortSignal
): Promise<AuthResponse> {
  return http<AuthResponse>(`${AUTH_URL}/auth/register`, {
    method: "POST",
    body: input,
    signal,
  });
}

export async function login(email: string, password: string, signal?: AbortSignal): Promise<AuthResponse> {
  return http<AuthResponse>(`${AUTH_URL}/auth/login`, {
    method: "POST",
    body: { email, password },
    signal,
  });
}

export async function sendOtp(email: string, signal?: AbortSignal): Promise<{ ok: boolean; message: string }> {
  return http<{ ok: boolean; message: string }>(`${AUTH_URL}/auth/send-otp`, {
    method: "POST",
    body: { email },
    signal,
  });
}

export async function verifyOtp(
  email: string,
  code: string,
  signal?: AbortSignal
): Promise<{ ok: boolean; verified: boolean }> {
  return http<{ ok: boolean; verified: boolean }>(`${AUTH_URL}/auth/verify-otp`, {
    method: "POST",
    body: { email, code },
    signal,
  });
}

export async function googleLogin(
  input: { email: string; displayName: string; role?: "teacher" | "student" },
  signal?: AbortSignal
): Promise<AuthResponse> {
  return http<AuthResponse>(`${AUTH_URL}/auth/google`, {
    method: "POST",
    body: input,
    signal,
  });
}

export async function fetchMe(
  token: string,
  signal?: AbortSignal
): Promise<{ user: { id: string; email: string; role: string } }> {
  return http(`${CORE_URL}/me`, { token, signal });
}
