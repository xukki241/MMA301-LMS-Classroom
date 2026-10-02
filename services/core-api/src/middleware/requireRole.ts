import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/httpError.js";
import type { AuthUser } from "./requireAuth.js";

/**
 * LMS-07: Middleware factory to check user role from JWT.
 * Must be mounted AFTER requireAuth in the middleware chain.
 *
 * Example:
 *   router.post("/classes", requireAuth, requireRole("teacher"), handler)
 *
 * @throws HttpError 401 if user is not authenticated
 * @throws HttpError 403 if user.role does not match allowed roles
 */
export function requireRole(...roles: AuthUser["role"][]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      next(new HttpError(401, "Missing bearer token", "UNAUTHENTICATED"));
      return;
    }

    if (!roles.includes(user.role)) {
      next(
        new HttpError(
          403,
          `Only ${roles.join(" or ")} can perform this action`,
          "FORBIDDEN"
        )
      );
      return;
    }

    next();
  };
}
