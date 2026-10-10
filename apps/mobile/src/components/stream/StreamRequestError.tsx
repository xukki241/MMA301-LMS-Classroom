import { useState } from "react";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { HelperText } from "react-native-paper";
import { AppButton } from "../ui/AppButton";
import { useAuth } from "../../lib/auth-context";
import { HttpError } from "../../lib/http";
import { streamErrorMessage } from "../../lib/stream-errors";

export function StreamRequestError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { logout } = useAuth();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const [logoutFailed, setLogoutFailed] = useState(false);
  if (!error) return null;
  const expired = error instanceof HttpError && error.status === 401;
  return (
    <View accessibilityLiveRegion="polite">
      <HelperText type="error" visible>{streamErrorMessage(error)}</HelperText>
      {logoutFailed ? <HelperText type="error" visible>Không thể đăng xuất. Vui lòng thử lại.</HelperText> : null}
      {expired ? (
        <AppButton loading={leaving} onPress={() => {
          setLeaving(true);
          setLogoutFailed(false);
          void logout().then(() => router.replace("/(auth)/login")).catch(() => {
            setLogoutFailed(true);
            setLeaving(false);
          });
        }}>Đăng nhập lại</AppButton>
      ) : onRetry ? <AppButton mode="outlined" onPress={onRetry}>Thử lại</AppButton> : null}
    </View>
  );
}
