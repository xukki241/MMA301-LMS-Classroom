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
  // Prefer device-reachable URL (Android emulator → http://10.0.2.2:4002) so hosted-launch opens.
  PUBLIC_CORE_URL: z.string().url().default("http://10.0.2.2:4002"),
  // Optional public/tunnel base for SePay-signed success/error/cancel (defaults to PUBLIC_CORE_URL).
  SEPAY_RETURN_BASE_URL: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().url().optional()),
  // Empty compose/env values mean "unset" so demo checkout stays available.
  SEPAY_MERCHANT_ID: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional()),
  SEPAY_SECRET_KEY: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional()),
  SEPAY_CHECKOUT_URL: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().url().optional()),
  SEPAY_BANK_CODE: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional()),
  SEPAY_BANK_ACCOUNT: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional()),
  SEPAY_BANK_NAME: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional()),
  CLOUDINARY_CLOUD_NAME: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional()),
  CLOUDINARY_API_KEY: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional()),
  CLOUDINARY_API_SECRET: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional()),
  CLOUDINARY_FOLDER: z.preprocess((v) => (v === "" || v == null ? "lms-classroom" : v), z.string().default("lms-classroom")),
});

const parsed = schema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT ?? process.env.CORE_PORT,
  JWT_SECRET: process.env.JWT_SECRET,
  MONGO_URI: process.env.MONGO_URI ?? process.env.CORE_MONGO_URI,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  JSON_BODY_LIMIT: process.env.JSON_BODY_LIMIT,
  TRUST_PROXY: process.env.TRUST_PROXY,
  PUBLIC_CORE_URL: process.env.PUBLIC_CORE_URL ?? "http://10.0.2.2:4002",
  SEPAY_RETURN_BASE_URL: process.env.SEPAY_RETURN_BASE_URL,
  SEPAY_MERCHANT_ID: process.env.SEPAY_MERCHANT_ID,
  SEPAY_SECRET_KEY: process.env.SEPAY_SECRET_KEY,
  SEPAY_CHECKOUT_URL: process.env.SEPAY_CHECKOUT_URL,
  SEPAY_BANK_CODE: process.env.SEPAY_BANK_CODE,
  SEPAY_BANK_ACCOUNT: process.env.SEPAY_BANK_ACCOUNT,
  SEPAY_BANK_NAME: process.env.SEPAY_BANK_NAME,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ?? process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  CLOUDINARY_FOLDER: process.env.CLOUDINARY_FOLDER,
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
