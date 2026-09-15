import { Router } from "express";
import { apiReference } from "@scalar/express-api-reference";
import { openApiSpec } from "../docs/openapi.js";

export const docsRouter = Router();

// Endpoint cung cấp raw OpenAPI JSON specification
docsRouter.get("/openapi.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.json(openApiSpec);
});

// Endpoint giao diện Scalar API Reference
docsRouter.use(
  "/docs",
  apiReference({
    pageTitle: "MMA301 LMS — Core API Reference (Nguyễn Anh Tú)",
    theme: "purple",
    spec: {
      content: openApiSpec,
    },
  })
);
