import { Router } from "express";
import { apiReference } from "@scalar/express-api-reference";
import { authOpenApiSpec } from "../docs/openapi.js";

export const docsRouter = Router();

docsRouter.get("/openapi.json", (_req, res) => {
  res.type("application/json").json(authOpenApiSpec);
});

docsRouter.use(
  "/docs",
  apiReference({
    pageTitle: "MMA301 LMS - Auth API Reference",
    theme: "purple",
    spec: { content: authOpenApiSpec },
  })
);
