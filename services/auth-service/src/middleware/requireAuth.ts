import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { HttpError } from "../lib/httpError.js";
import type { UserRole } from "../models/User.js";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  displayName?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  name?: string;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header("authorization") ?? req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    next(new HttpError(401, "Missing bearer token", "UNAUTHENTICATED"));
    return;
  }
  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    next(new HttpError(401, "Missing bearer token", "UNAUTHENTICATED"));
    return;
  }
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      issuer: "lms-auth-service",
      audience: "lms-core-api",
    }) as JwtPayload;
    if (!decoded.sub || !decoded.email || !decoded.role) {
      next(new HttpError(401, "Invalid token payload", "INVALID_TOKEN"));
      return;
    }
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      ...(typeof decoded.name === "string" && decoded.name.trim()
        ? { displayName: decoded.name.trim() }
        : {}),
    };
    next();
  } catch {
    next(new HttpError(401, "Invalid or expired token", "INVALID_TOKEN"));
  }
}
