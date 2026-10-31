import type { ErrorRequestHandler } from "express";
import { HttpError } from "../lib/httpError.js";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const requestId = String(res.locals.requestId ?? "unknown");
  const sendError = (status: number, message: string, code: string) => {
    res.status(status).json({ error: message, code, requestId });
  };
  if (err instanceof HttpError) {
    sendError(err.status, err.message, err.code);
    return;
  }

  if (err instanceof SyntaxError) {
    sendError(400, "Invalid JSON", "INVALID_JSON");
    return;
  }

  if (
    typeof err === "object" &&
    err &&
    "type" in err &&
    (err as { type?: string }).type === "entity.too.large"
  ) {
    sendError(413, "Payload too large", "PAYLOAD_TOO_LARGE");
    return;
  }

  console.error(err);
  sendError(500, "Internal server error", "INTERNAL");
};
