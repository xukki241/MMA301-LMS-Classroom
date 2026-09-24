import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { healthRouter } from "./routes/health.routes.js";
import { meRouter } from "./routes/me.routes.js";
import { classRouter } from "./routes/class.routes.js";
import { postRouter } from "./routes/post.routes.js";
import { docsRouter } from "./routes/docs.routes.js";
import { exerciseRouter } from "./routes/exercise.routes.js";
import { submissionRouter } from "./routes/submission.routes.js";

function corsOptions(origin: string): cors.CorsOptions {
  if (origin.trim() === "*") {
    return { origin: true };
  }
  return {
    origin: origin
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  };
}

export function createApp() {
  const app = express();
  if (env.trustProxy) {
    app.set("trust proxy", 1);
  }
  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );
  app.use(cors(corsOptions(env.CORS_ORIGIN)));
  app.use(express.json({ limit: env.JSON_BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: env.JSON_BODY_LIMIT }));
  app.use(docsRouter);
  app.use(healthRouter);
  app.use(meRouter);
  app.use(classRouter);
  app.use(postRouter);
  app.use(exerciseRouter);
  app.use(submissionRouter);
  app.use(errorHandler);
  return app;
}
