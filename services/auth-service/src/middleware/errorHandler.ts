import type { ErrorRequestHandler } from "express";
import { HttpError } from "../lib/httpError.js";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, code: err.code });
    return;
  }

  if (err instanceof SyntaxError) {
    res.status(400).json({ error: "Invalid JSON", code: "INVALID_JSON" });
    return;
  }

  if (
    typeof err === "object" &&
    err &&
    "type" in err &&
    (err as { type?: string }).type === "entity.too.large"
  ) {
    res.status(413).json({ error: "Payload too large", code: "PAYLOAD_TOO_LARGE" });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error", code: "INTERNAL" });
};
