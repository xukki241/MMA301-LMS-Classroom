import dotenv from "dotenv";
import path from "node:path";
import { z } from "zod";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4001),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("7d"),
  MONGO_URI: z.string().min(1),
  CORS_ORIGIN: z.string().default("*"),
  JSON_BODY_LIMIT: z.string().default("10mb"),
  TRUST_PROXY: z.string().optional(),
  SEED_TEACHER_EMAIL: z.string().email().default("teacher@lms.local"),
  SEED_STUDENT_EMAIL: z.string().email().default("student@lms.local"),
  SEED_PASSWORD: z.string().min(8).default("Demo123!"),
});

const parsed = schema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT ?? process.env.AUTH_PORT,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  MONGO_URI: process.env.MONGO_URI ?? process.env.AUTH_MONGO_URI,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  JSON_BODY_LIMIT: process.env.JSON_BODY_LIMIT,
  TRUST_PROXY: process.env.TRUST_PROXY,
  SEED_TEACHER_EMAIL: process.env.SEED_TEACHER_EMAIL,
  SEED_STUDENT_EMAIL: process.env.SEED_STUDENT_EMAIL,
  SEED_PASSWORD: process.env.SEED_PASSWORD,
});

if (!parsed.success) {
  console.error("Invalid auth-service env", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

function parseTrustProxy(raw: string | undefined, nodeEnv: string): boolean {
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return nodeEnv === "production";
}

export const env = {
  ...parsed.data,
  trustProxy: parseTrustProxy(parsed.data.TRUST_PROXY, parsed.data.NODE_ENV),
};
