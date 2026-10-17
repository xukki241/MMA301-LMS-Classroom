import { router } from "expo-router";
import { ActivityIndicator, Button, Text, useTheme } from "react-native-paper";
import { StyleSheet, View } from "react-native";
import { Screen } from "../../components/ui/Screen";
import { ErrorState } from "../../components/ui/EmptyState";
import { useAuth } from "../../lib/auth-context";
import { HttpError } from "../../lib/http";
import { spacing } from "../../theme/tokens";

export function exercisePath(classId: string) {
  return `/teacher/class/${encodeURIComponent(classId)}/exercises` as const;
}

export function formatDate(value: string) {
  return new Date(value).toLocaleString("vi-VN", { hour12: false });
}

export function errorMessage(error: unknown) {
  if (error instanceof HttpError) {
    if (error.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    if (error.status === 403) return "Bạn không có quyền thực hiện thao tác trong lớp này.";
    if (error.status === 404) return "Không tìm thấy lớp, bài tập hoặc bài nộp.";
    if (error.code === "GRADING_NOT_OPEN") return "Chưa đến hạn chấm điểm theo giờ máy chủ. Vui lòng thử lại sau hạn nộp.";
    if (error.code === "INVALID_DUE_AT") return "Hạn nộp không hợp lệ hoặc đã qua. Hãy chọn lại thời gian.";
    return error.message;
  }
  return "Không kết nối được máy chủ. Kiểm tra mạng và thử lại.";
}

export function LoadingScreen() {
  return <Screen><ActivityIndicator accessibilityLabel="Đang tải" style={{ marginTop: 32 }} /></Screen>;
}

export function FailureScreen({ error, retry }: { error: unknown; retry?: () => void }) {
  return <Screen><FailureNotice error={error} retry={retry} /></Screen>;
}

export function FailureNotice({ error, retry }: { error: unknown; retry?: () => void }) {
  const { logout } = useAuth();
  const unauthorized = error instanceof HttpError && error.status === 401;
  const denied = error instanceof HttpError && [400, 403, 404].includes(error.status);
  return <View>
    <ErrorState message={errorMessage(error)} onRetry={unauthorized || denied ? undefined : retry} />
    {unauthorized ? <Button onPress={async () => { await logout(); router.replace("/(auth)/login"); }}>Đăng nhập lại</Button> : null}
  </View>;
}

export function FieldError({ message }: { message?: string }) {
  const theme = useTheme();
  return message ? <Text accessibilityRole="alert" style={{ color: theme.colors.error }}>{message}</Text> : null;
}

export const styles = StyleSheet.create({
  stack: { gap: spacing.lg },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  card: { padding: spacing.lg, gap: spacing.sm },
  muted: { opacity: 0.7 },
});
