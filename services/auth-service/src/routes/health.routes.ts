import { Router } from "express";
import mongoose from "mongoose";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  const mongoUp = mongoose.connection.readyState === 1;
  res.status(mongoUp ? 200 : 503).json({
    ok: mongoUp,
    service: "auth-service",
    mongo: mongoUp ? "up" : "down",
  });
});
