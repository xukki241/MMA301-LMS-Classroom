export const authOpenApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "MMA301 LMS Classroom - Auth Service",
    version: "1.0.0",
    description: "Authentication API for the LMS Classroom MVP.",
  },
  servers: [
    { url: "http://localhost:4001", description: "Local Auth Service" },
    { url: "http://localhost:14001", description: "Test Auth Service" },
    { url: "https://lms-auth.onrender.com", description: "Render placeholder" },
  ],
  tags: [
    { name: "System", description: "Health and readiness endpoints" },
    { name: "Authentication", description: "Register and login" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["System"],
        summary: "Check Auth Service health",
        operationId: "getAuthHealth",
        responses: {
          "200": { description: "Service and MongoDB are healthy", content: { "application/json": { schema: { $ref: "#/components/schemas/HealthResponse" }, example: { ok: true, service: "auth-service", mongo: "up" } } } },
          "503": { $ref: "#/components/responses/ServiceUnavailable" },
        },
      },
    },
    "/auth/register": {
      post: {
        tags: ["Authentication"],
        summary: "Register a user",
        operationId: "registerUser",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterRequest" }, example: { email: "new.student@example.com", password: "Demo123!", displayName: "New Student", role: "student" } } } },
        responses: {
          "201": { description: "User registered", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } } },
          "400": { $ref: "#/components/responses/ValidationError" },
          "409": { $ref: "#/components/responses/Conflict" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Login and issue a JWT",
        operationId: "loginUser",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" }, example: { email: "teacher@lms.local", password: "Demo123!" } } } },
        responses: {
          "200": { description: "Login succeeded", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } } },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      RegisterRequest: {
        type: "object", required: ["email", "password", "displayName", "role"], additionalProperties: false,
        properties: {
          email: { type: "string", format: "email" }, password: { type: "string", minLength: 8, maxLength: 72 },
          displayName: { type: "string", minLength: 2, maxLength: 80 }, role: { type: "string", enum: ["teacher", "student"] },
        },
      },
      LoginRequest: { type: "object", required: ["email", "password"], additionalProperties: false, properties: { email: { type: "string", format: "email" }, password: { type: "string", minLength: 1 } } },
      User: { type: "object", required: ["id", "email", "displayName", "role"], properties: { id: { type: "string" }, email: { type: "string", format: "email" }, displayName: { type: "string" }, role: { type: "string", enum: ["teacher", "student"] } } },
      AuthResponse: { type: "object", required: ["token", "user"], properties: { token: { type: "string" }, user: { $ref: "#/components/schemas/User" } } },
      HealthResponse: { type: "object", required: ["ok", "service", "mongo"], properties: { ok: { type: "boolean" }, service: { type: "string" }, mongo: { type: "string", enum: ["up", "down"] } } },
      ErrorResponse: { type: "object", required: ["error", "code", "requestId"], properties: { error: { type: "string" }, code: { type: "string" }, requestId: { type: "string" } } },
    },
    responses: {
      ValidationError: { description: "Invalid request", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
      Unauthorized: { description: "Invalid credentials", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
      Conflict: { description: "Resource already exists", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
      TooManyRequests: { description: "Rate limit exceeded", headers: { "Retry-After": { schema: { type: "integer" } } }, content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
      ServiceUnavailable: { description: "Service or database unavailable", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
      InternalError: { description: "Unexpected server error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
    },
  },
} as const;
