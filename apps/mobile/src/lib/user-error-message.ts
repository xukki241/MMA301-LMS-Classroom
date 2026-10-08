export const GENERIC_NETWORK_MESSAGE = "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";

const UNSAFE = /https?:\/\/|java\.|fetch failed|\n\s+at\s|\bat\s+\S+\(|exception|stack|ECONN|ENOTFOUND|\.kt:|\.js:\d/i;

/** Map a thrown value to text safe to show users (no internal URLs / stack traces). */
export function userErrorMessage(error: unknown): string {
  if (!(error instanceof Error) || error instanceof TypeError) return GENERIC_NETWORK_MESSAGE;
  const message = typeof error.message === "string" ? error.message.trim() : "";
  if (!message || UNSAFE.test(message)) return GENERIC_NETWORK_MESSAGE;
  const status = (error as { status?: unknown }).status;
  // Network-level HttpError (status 0) already carries a safe Vietnamese message.
  if (typeof status === "number" || error.name === "HttpError") return message;
  return GENERIC_NETWORK_MESSAGE;
}
