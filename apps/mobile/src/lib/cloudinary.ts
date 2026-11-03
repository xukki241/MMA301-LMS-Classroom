import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { HttpError } from "./http";
import { uploadClassFile, type ClassFileItem } from "./files-api";

const CLOUD = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
const PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "";

export function cloudinaryConfigured() {
  // Ưu tiên upload qua core-api (có API secret). Unsigned preset vẫn dùng được nếu có.
  return true;
}

export type PickedFile = {
  uri: string;
  name: string;
  mimeType: string;
};

function readBlob(uri: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const fail = () => reject(new HttpError("Không đọc được tệp đã chọn.", 422, "FILE_READ"));
    fetch(uri)
      .then((response) => {
        if (!response.ok) throw new Error("read failed");
        return response.blob();
      })
      .then((blob) => {
        const reader = new FileReader();
        reader.onerror = fail;
        reader.onload = () => {
          const value = String(reader.result ?? "");
          if (!value.startsWith("data:") || !value.includes("base64,")) fail();
          else resolve(value);
        };
        reader.readAsDataURL(blob);
      })
      .catch(() => fail());
  });
}

async function toDataUri(file: PickedFile): Promise<string> {
  if (file.uri.startsWith("data:") && file.uri.includes("base64,")) return file.uri;
  if (Platform.OS === "web" || file.uri.startsWith("blob:") || file.uri.startsWith("http")) {
    return readBlob(file.uri);
  }
  try {
    const base64 = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const mime = file.mimeType || "application/octet-stream";
    return `data:${mime};base64,${base64}`;
  } catch {
    return readBlob(file.uri);
  }
}

/** Upload qua core-api → Cloudinary, lưu metadata ClassFile. */
export async function uploadToCloudinary(
  file: PickedFile,
  options?: { token?: string; classId?: string; purpose?: ClassFileItem["purpose"] },
): Promise<string> {
  if (options?.token && options.classId) {
    const dataUri = await toDataUri(file);
    const uploaded = await uploadClassFile(options.token, options.classId, {
      dataUri,
      fileName: file.name,
      mimeType: file.mimeType,
      purpose: options.purpose ?? "other",
    });
    return uploaded.url;
  }

  // Fallback unsigned (nếu chưa truyền token/classId nhưng đã có preset)
  if (!CLOUD || !PRESET) {
    throw new HttpError(
      "Thiếu token/classId hoặc Cloudinary env. Upload cần đăng nhập trong lớp.",
      500,
      "CLOUDINARY_MISSING",
    );
  }
  const form = new FormData();
  form.append("file", {
    uri: file.uri,
    type: file.mimeType || "application/octet-stream",
    name: file.name || "upload.bin",
  } as unknown as Blob);
  form.append("upload_preset", PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/auto/upload`, {
    method: "POST",
    body: form,
  });
  const body = (await res.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } };
  if (!res.ok || !body.secure_url) {
    throw new HttpError(
      body.error?.message || "Upload Cloudinary thất bại.",
      res.status || 502,
      "CLOUDINARY_UPLOAD_FAILED",
    );
  }
  return body.secure_url;
}
