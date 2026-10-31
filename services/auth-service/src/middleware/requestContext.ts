import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

export const requestContext: RequestHandler = (req, res, next) => {
  const requestId = req.header("X-Request-Id")?.trim() || randomUUID();
  res.setHeader("X-Request-Id", requestId);
  res.locals.requestId = requestId;
  next();
};
