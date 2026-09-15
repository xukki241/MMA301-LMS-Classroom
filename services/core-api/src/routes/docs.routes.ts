import { Router } from "express";
import jwt from "jsonwebtoken";
import { apiReference } from "@scalar/express-api-reference";
import { env } from "../config/env.js";
import { openApiSpec } from "../docs/openapi.js";

export const docsRouter = Router();

// Endpoint cung cap raw OpenAPI JSON specification
docsRouter.get("/openapi.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.json(openApiSpec);
});

// Helper lay token tu Auth Service hoac fallback JWT
async function getOrGenerateToken(role: "teacher" | "student") {
  const email = role === "teacher" ? "teacher@lms.local" : "student@lms.local";
  const password = "Demo123!";

  try {
    const authRes = await fetch("http://127.0.0.1:4001/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (authRes.ok) {
      const data = (await authRes.json()) as { token: string; user: { id: string; email: string; role: string } };
      return {
        source: "auth-service",
        token: data.token,
        user: data.user,
      };
    }
  } catch {
    // Auth Service chua khoi dong, fallback tao JWT hop le voi cung secret
  }

  const fallbackSub = role === "teacher" ? "teacher_seed_id_01" : "student_seed_id_01";
  const token = jwt.sign(
    { sub: fallbackSub, email, role },
    env.JWT_SECRET,
    {
      expiresIn: "7d",
      issuer: "lms-auth-service",
      audience: "lms-core-api",
    }
  );

  return {
    source: "local-fallback",
    token,
    user: {
      id: fallbackSub,
      email,
      role,
    },
  };
}

// Endpoint lay token Giao vien (Teacher) 1-Click
docsRouter.post("/docs/tokens/teacher", async (_req, res) => {
  const result = await getOrGenerateToken("teacher");
  res.status(200).json({
    role: "teacher",
    email: "teacher@lms.local",
    token: result.token,
    user: result.user,
    source: result.source,
    huongDanSuDung: "1. Sao chep gia tri 'token' o tren. 2. Nhap vao nut 'Authorize' goc tren giao dien Scalar. 3. Dan token vao o BearerAuth de goi cac API danh cho Giao vien.",
  });
});

// Endpoint lay token Hoc sinh (Student) 1-Click
docsRouter.post("/docs/tokens/student", async (_req, res) => {
  const result = await getOrGenerateToken("student");
  res.status(200).json({
    role: "student",
    email: "student@lms.local",
    token: result.token,
    user: result.user,
    source: result.source,
    huongDanSuDung: "1. Sao chep gia tri 'token' o tren. 2. Nhap vao nut 'Authorize' goc tren giao dien Scalar. 3. Dan token vao o BearerAuth de goi cac API danh cho Hoc sinh.",
  });
});

// Proxy endpoint dang nhap qua Auth Service
docsRouter.post("/auth/login", async (req, res) => {
  try {
    const authRes = await fetch("http://127.0.0.1:4001/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const data = await authRes.json();
    res.status(authRes.status).json(data);
  } catch {
    res.status(503).json({
      error: {
        code: "AUTH_SERVICE_UNAVAILABLE",
        message: "Auth Service (cong 4001) chua duoc bat. Hay dung endpoint /docs/tokens/teacher hoac /docs/tokens/student de lay token test.",
      },
    });
  }
});

// Giao dien Scalar API Reference
docsRouter.use(
  "/docs",
  apiReference({
    pageTitle: "MMA301 LMS - Core API Reference (Nguyen Anh Tu)",
    theme: "purple",
    spec: {
      content: openApiSpec,
    },
  })
);
