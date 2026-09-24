import { Link, Redirect } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  Icon,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useAuth } from "@/src/lib/auth-context";
import { AppButton } from "@/src/components/ui/AppButton";
import { impactLight, notifyError, notifySuccess } from "@/src/lib/haptics";
import { palette, spacing, typography } from "@/src/theme/tokens";

export default function LoginScreen() {
  const theme = useTheme();
  const { user, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) {
    return <Redirect href="/" />;
  }

  const fillDemo = (role: "teacher" | "student") => {
    impactLight();
    setEmail(role === "teacher" ? "teacher@lms.local" : "student@lms.local");
    setPassword("Demo123!");
    setError(null);
  };

  const handleLogin = () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Vui lòng nhập địa chỉ email của bạn");
      notifyError();
      return;
    }
    if (!password) {
      setError("Vui lòng nhập mật khẩu đăng nhập");
      notifyError();
      return;
    }

    setBusy(true);
    setError(null);

    void login(trimmedEmail, password)
      .then(() => notifySuccess())
      .catch((err: Error) => {
        notifyError();
        setError(err.message || "Đăng nhập không thành công, vui lòng thử lại");
      })
      .finally(() => setBusy(false));
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
          {/* LMS Hero Header */}
          <Animated.View entering={FadeInDown.duration(450).springify()} style={styles.header}>
            <View style={[styles.logoContainer, { backgroundColor: theme.colors.primaryContainer, borderColor: palette.primarySoft }]}>
              <View style={[styles.logoCircle, { backgroundColor: theme.colors.primary }]}>
                <Icon source="school" size={34} color="#FFFFFF" />
              </View>
            </View>

            <View style={[styles.pillBadge, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Icon source="sparkles" size={13} color={theme.colors.primary} />
              <Text style={[styles.pillText, { color: theme.colors.primary }]}>
                LMS CLASSROOM
              </Text>
            </View>

            <Text style={[typography.title, styles.title, { color: theme.colors.onBackground }]}>
              Chào mừng bạn trở lại! 👋
            </Text>
            <Text style={[typography.body, styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              Đăng nhập để vào không gian lớp học và tiếp tục các bài giảng của bạn
            </Text>
          </Animated.View>

          {/* Form Card */}
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
            {/* Error Banner */}
            {Boolean(error) && (
              <View style={styles.errorBanner}>
                <Icon source="alert-circle-outline" size={20} color={palette.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <TextInput
                mode="outlined"
                label="Địa chỉ Email"
                placeholder="hocvien@school.edu.vn"
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
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <TextInput
                mode="outlined"
                label="Mật khẩu"
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (error) setError(null);
                }}
                left={<TextInput.Icon icon="lock-outline" color={theme.colors.onSurfaceVariant} />}
                right={
                  <TextInput.Icon
                    icon={showPassword ? "eye-off-outline" : "eye-outline"}
                    color={theme.colors.onSurfaceVariant}
                    onPress={() => setShowPassword(!showPassword)}
                    forceTextInputFocus={false}
                  />
                }
                outlineStyle={styles.inputOutline}
                style={styles.textInput}
              />

              <View style={styles.forgotRow}>
                <Link href={"/(auth)/forgot-password" as any} asChild>
                  <Pressable hitSlop={8}>
                    <Text style={[typography.caption, styles.forgotText, { color: theme.colors.primary }]}>
                      Quên mật khẩu?
                    </Text>
                  </Pressable>
                </Link>
              </View>
            </View>

            {/* Submit Button */}
            <AppButton
              loading={busy}
              disabled={busy}
              onPress={handleLogin}
              icon="login-variant"
              style={styles.loginBtn}
            >
              Đăng nhập vào lớp học
            </AppButton>

            {/* Quick Demo Section */}
            <View style={[styles.demoCard, { backgroundColor: theme.colors.surfaceVariant }]}>
              <View style={styles.demoHeader}>
                <Icon source="account-key-outline" size={15} color={theme.colors.primary} />
                <Text style={[styles.demoTitle, { color: theme.colors.onSurfaceVariant }]}>
                  Dùng thử tài khoản mẫu (Click để điền nhanh):
                </Text>
              </View>

              <View style={styles.demoButtonsRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.demoPill,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
                    pressed && styles.pillPressed,
                  ]}
                  onPress={() => fillDemo("teacher")}
                >
                  <Text style={styles.demoPillEmoji}>👨‍🏫</Text>
                  <Text style={[styles.demoPillText, { color: palette.teacher }]}>
                    Giáo viên
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.demoPill,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
                    pressed && styles.pillPressed,
                  ]}
                  onPress={() => fillDemo("student")}
                >
                  <Text style={styles.demoPillEmoji}>👨‍🎓</Text>
                  <Text style={[styles.demoPillText, { color: palette.student }]}>
                    Học sinh
                  </Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>

          {/* Footer Register Link */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(450).springify()}
            style={styles.footer}
          >
            <Text style={[typography.body, { color: theme.colors.onSurfaceVariant }]}>
              Chưa có tài khoản LMS?{" "}
            </Text>
            <Link href={"/(auth)/register" as any} asChild>
              <Pressable hitSlop={8}>
                <Text style={[styles.registerLink, { color: theme.colors.primary }]}>
                  Đăng ký ngay
                </Text>
              </Pressable>
            </Link>
          </Animated.View>

          {/* Bottom Education Slogan */}
          <View style={styles.bottomSlogan}>
            <Icon source="shield-check-outline" size={14} color={palette.inkFaint} />
            <Text style={styles.sloganText}>
              Nền tảng lớp học thông minh & an toàn
            </Text>
          </View>
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  logoContainer: {
    width: 76,
    height: 76,
    borderRadius: 24,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  logoCircle: {
    width: 58,
    height: 58,
    borderRadius: 18,
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
    marginBottom: spacing.sm,
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
    gap: spacing.md,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
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
  inputGroup: {
    gap: 4,
  },
  textInput: {
    backgroundColor: "transparent",
  },
  inputOutline: {
    borderRadius: 14,
  },
  forgotRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  forgotText: {
    fontWeight: "600",
  },
  loginBtn: {
    borderRadius: 14,
    paddingVertical: 4,
    marginTop: 2,
  },
  demoCard: {
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: 2,
  },
  demoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  demoTitle: {
    fontSize: 12,
    fontWeight: "600",
  },
  demoButtonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  demoPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  pillPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  demoPillEmoji: {
    fontSize: 14,
  },
  demoPillText: {
    fontSize: 13,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.xl,
  },
  registerLink: {
    fontSize: 15,
    fontWeight: "800",
  },
  bottomSlogan: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
    marginTop: spacing.lg,
  },
  sloganText: {
    fontSize: 12,
    color: palette.inkFaint,
    fontWeight: "500",
  },
});
