import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Icon, Text, TextInput, useTheme } from "react-native-paper";
import { AppButton } from "@/src/components/ui/AppButton";
import { notifyError, notifySuccess } from "@/src/lib/haptics";
import { palette, spacing, typography } from "@/src/theme/tokens";

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const validateEmail = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return "Vui lòng nhập địa chỉ email của bạn";
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar with Back Button */}
          <View style={styles.topBar}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backButton,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
                pressed && styles.pressed,
              ]}
              hitSlop={8}
            >
              <Icon source="arrow-left" size={20} color={theme.colors.onSurface} />
              <Text style={[styles.backText, { color: theme.colors.onSurfaceVariant }]}>
                Đăng nhập
              </Text>
            </Pressable>
          </View>

          {/* Header */}
          <Animated.View entering={FadeInDown.duration(450).springify()} style={styles.header}>
            <View style={[styles.logoContainer, { backgroundColor: theme.colors.primaryContainer, borderColor: palette.primarySoft }]}>
              <View style={[styles.logoCircle, { backgroundColor: theme.colors.primary }]}>
                <Icon source="lock-reset" size={32} color="#FFFFFF" />
              </View>
            </View>

            <View style={[styles.pillBadge, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Icon source="shield-key-outline" size={13} color={theme.colors.primary} />
              <Text style={[styles.pillText, { color: theme.colors.primary }]}>
                HỖ TRỢ TÀI KHOẢN
              </Text>
            </View>

            <Text style={[typography.title, styles.title, { color: theme.colors.onBackground }]}>
              Khôi phục mật khẩu 🔑
            </Text>
            <Text style={[typography.body, styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              Nhập email tài khoản LMS của bạn để nhận liên kết đặt lại mật khẩu mới
            </Text>
          </Animated.View>

          {/* Main Card */}
          <Animated.View
            entering={FadeInDown.delay(120).duration(450).springify()}
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
              },
            ]}
          >
            {!submitted ? (
              <View style={styles.formGap}>
                {Boolean(error) && (
                  <View style={styles.errorBanner}>
                    <Icon source="alert-circle-outline" size={20} color={palette.danger} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <TextInput
                  mode="outlined"
                  label="Email tài khoản"
                  placeholder="vidu@school.edu.vn"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (error) setError(null);
                  }}
                  left={<TextInput.Icon icon="email-outline" color={theme.colors.onSurfaceVariant} />}
                  outlineStyle={styles.inputOutline}
                  style={styles.textInput}
                />

                <AppButton
                  loading={busy}
                  disabled={busy}
                  onPress={handleSendInstructions}
                  icon="send-outline"
                  style={styles.submitBtn}
                >
                  Gửi hướng dẫn khôi phục
                </AppButton>
              </View>
            ) : (
              <View style={styles.successBox}>
                <View style={[styles.successBadge, { backgroundColor: palette.secondarySoft }]}>
                  <Icon source="email-check-outline" size={38} color={palette.secondary} />
                </View>
                <Text style={[typography.subtitle, { textAlign: "center", color: theme.colors.onSurface, fontWeight: "800" }]}>
                  Đã gửi email khôi phục!
                </Text>
                <Text style={[typography.body, { color: theme.colors.onSurfaceVariant, textAlign: "center", fontSize: 14 }]}>
                  Nếu tài khoản <Text style={{ fontWeight: "700", color: theme.colors.primary }}>{email.trim()}</Text> tồn tại trên LMS Classroom, bạn sẽ nhận được hướng dẫn ngay.
                </Text>

                <View style={styles.successActions}>
                  <AppButton
                    mode="contained"
                    onPress={() => {
                      setSubmitted(false);
                      setEmail("");
                    }}
                    style={styles.submitBtn}
                  >
                    Thử email khác
                  </AppButton>
                  <AppButton
                    mode="outlined"
                    onPress={() => router.replace("/(auth)/login")}
                    style={styles.submitBtn}
                  >
                    Quay lại Đăng nhập
                  </AppButton>
                </View>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  backText: {
    fontSize: 13,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 22,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  logoCircle: {
    width: 54,
    height: 54,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  pillBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
    marginBottom: spacing.xs,
  },
  pillText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.4,
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 320,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: spacing.xl,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  formGap: {
    gap: spacing.md,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.dangerSoft,
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: palette.danger,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  textInput: {
    backgroundColor: "transparent",
  },
  inputOutline: {
    borderRadius: 14,
  },
  submitBtn: {
    borderRadius: 14,
    paddingVertical: 4,
  },
  successBox: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  successBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  successActions: {
    width: "100%",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
