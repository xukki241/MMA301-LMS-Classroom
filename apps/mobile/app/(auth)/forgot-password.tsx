import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { HelperText, Icon, Text, TextInput, useTheme } from "react-native-paper";
import { AppButton } from "@/src/components/ui/AppButton";
import { notifyError, notifySuccess } from "@/src/lib/haptics";
import { spacing, typography } from "@/src/theme/tokens";

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const validateEmail = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return "Vui lòng nhập địa chỉ email";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) return "Địa chỉ email không hợp lệ";
    return null;
  };

  const handleSendInstructions = async () => {
    const valError = validateEmail(email);
    if (valError) {
      setError(valError);
      notifyError();
      return;
    }

    setError(null);
    setBusy(true);

    try {
      // Giả lập gửi yêu cầu khôi phục mật khẩu (mocking workflow theo yêu cầu LMS-13)
      await new Promise((resolve) => setTimeout(resolve, 1000));
      notifySuccess();
      setSubmitted(true);
    } catch {
      notifyError();
      setError("Không thể gửi yêu cầu lúc này. Vui lòng thử lại sau.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.springify()} style={styles.hero}>
          <Text style={typography.title}>Khôi phục mật khẩu</Text>
          <Text style={[typography.body, { color: theme.colors.onSurfaceVariant }]}>
            Nhập địa chỉ email đăng ký tài khoản Teacher hoặc Student của bạn để nhận hướng dẫn khôi phục.
          </Text>
        </Animated.View>

        {!submitted ? (
          <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.form}>
            <TextInput
              mode="outlined"
              label="Email đã đăng ký"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError(null);
              }}
              left={<TextInput.Icon icon="email-outline" />}
              error={Boolean(error)}
            />
            <HelperText type="error" visible={Boolean(error)}>
              {error}
            </HelperText>

            <AppButton loading={busy} disabled={busy} onPress={handleSendInstructions}>
              Gửi hướng dẫn
            </AppButton>

            <AppButton mode="text" haptic={false} onPress={() => router.back()}>
              Quay lại Đăng nhập
            </AppButton>
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeInDown.springify()}
            style={[styles.successBox, { backgroundColor: theme.colors.surfaceVariant }]}
          >
            <View style={styles.iconCenter}>
              <Icon source="email-check-outline" size={54} color={theme.colors.primary} />
            </View>
            <Text style={[typography.subtitle, { textAlign: "center" }]}>
              Đã gửi yêu cầu khôi phục!
            </Text>
            <Text style={[typography.body, { color: theme.colors.onSurfaceVariant, textAlign: "center" }]}>
              Nếu email <Text style={{ fontWeight: "700" }}>{email.trim()}</Text> tồn tại trong hệ thống LMS Classroom,
              bạn sẽ sớm nhận được thư chứa liên kết đặt lại mật khẩu.
            </Text>
            <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant, textAlign: "center" }]}>
              Vui lòng kiểm tra cả hòm thư chính và mục Thư rác (Spam).
            </Text>

            <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
              <AppButton
                mode="contained"
                onPress={() => {
                  setSubmitted(false);
                  setEmail("");
                }}
              >
                Gửi lại với email khác
              </AppButton>
              <AppButton mode="outlined" onPress={() => router.replace("/(auth)/login")}>
                Quay lại Đăng nhập
              </AppButton>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xxl,
    justifyContent: "center",
    gap: spacing.xl,
  },
  hero: { gap: spacing.sm },
  form: { gap: spacing.sm },
  successBox: {
    padding: spacing.lg,
    borderRadius: 16,
    gap: spacing.md,
  },
  iconCenter: {
    alignItems: "center",
    marginBottom: spacing.xs,
  },
});
