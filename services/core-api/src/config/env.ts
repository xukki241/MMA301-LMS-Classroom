import dotenv from "dotenv";
import path from "node:path";
import { z } from "zod";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4002),
  JWT_SECRET: z.string().min(32),
  MONGO_URI: z.string().min(1),
  CORS_ORIGIN: z.string().default("*"),
  JSON_BODY_LIMIT: z.string().default("10mb"),
  TRUST_PROXY: z.string().optional(),
});

const parsed = schema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT ?? process.env.CORE_PORT,
  JWT_SECRET: process.env.JWT_SECRET,
  MONGO_URI: process.env.MONGO_URI ?? process.env.CORE_MONGO_URI,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  JSON_BODY_LIMIT: process.env.JSON_BODY_LIMIT,
  TRUST_PROXY: process.env.TRUST_PROXY,
});

if (!parsed.success) {
  console.error("Invalid core-api env", parsed.error.flatten().fieldErrors);
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
