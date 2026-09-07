import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { HttpError } from "../lib/httpError.js";

export interface AuthUser {
  id: string;
  email: string;
  role: "teacher" | "student";
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
  role: "teacher" | "student";
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

    req.user = { id: decoded.sub, email: decoded.email, role: decoded.role };
    next();
  } catch {
    next(new HttpError(401, "Invalid or expired token", "INVALID_TOKEN"));
  }
}
