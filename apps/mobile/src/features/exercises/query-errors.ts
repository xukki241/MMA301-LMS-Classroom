import { HttpError } from "../../lib/http";

// A temporary refresh failure must not erase an already-open form.
// Initial failures and lost access must still hide protected content.
export function blocksScreen(error: unknown, hasAuthorizedData: boolean) {
  if (!hasAuthorizedData) return true;
  return error instanceof HttpError && error.status >= 400 && error.status < 500 && error.status !== 429;
}
