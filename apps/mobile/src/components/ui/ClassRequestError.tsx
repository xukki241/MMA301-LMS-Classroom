import { useState } from "react";
import { View } from "react-native";
import { HelperText } from "react-native-paper";
import { useAuth } from "@/src/lib/auth-context";
import { classErrorMessage, type ClassOperation } from "@/src/lib/class-errors";
import { HttpError } from "@/src/lib/http";
import { AppButton } from "./AppButton";
import { ErrorState } from "./EmptyState";

export function ClassRequestError({ error, operation, onRetry, inline = false }: {
  error: unknown;
  operation: ClassOperation;
  onRetry?: () => void;
  inline?: boolean;
}) {
  const { logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [logoutFailed, setLogoutFailed] = useState(false);
  const expired = error instanceof HttpError && error.status === 401;
  const message = classErrorMessage(error, operation);

  return (
    <View accessibilityLiveRegion="polite">
      {inline ? <HelperText type="error" visible>{message}</HelperText>
        : <ErrorState message={message} onRetry={expired ? undefined : onRetry} />}
      {expired ? (
        <AppButton loading={busy} onPress={() => {
          if (busy) return;
          setBusy(true);
          setLogoutFailed(false);
          void logout().catch(() => setLogoutFailed(true)).finally(() => setBusy(false));
        }}>
          Đăng nhập lại
        </AppButton>
      ) : null}
      {logoutFailed ? <HelperText type="error" visible>Không thể xóa phiên đăng nhập. Vui lòng thử lại.</HelperText> : null}
    </View>
  );
}
