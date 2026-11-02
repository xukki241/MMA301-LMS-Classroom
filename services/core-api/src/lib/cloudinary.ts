import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";
import { HttpError } from "./httpError.js";

export function cloudinaryReady() {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}

export function assertCloudinaryConfigured() {
  if (!cloudinaryReady()) {
    throw new HttpError(
      503,
      "Chưa cấu hình Cloudinary (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET).",
      "CLOUDINARY_NOT_CONFIGURED",
    );
  }
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export { cloudinary };
