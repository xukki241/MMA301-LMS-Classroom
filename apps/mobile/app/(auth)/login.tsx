import { Link, Redirect } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
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
import { FieldError, FormNotice, keyboardBehavior } from "@/src/components/ui/FormFeedback";
import { impactLight, notifyError, notifySuccess } from "@/src/lib/haptics";
import { userErrorMessage } from "@/src/lib/user-error-message";
import { palette, spacing, typography, radius } from "@/src/theme/tokens";

export default function LoginScreen() {
  const theme = useTheme();
  const { user, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) {
    return <Redirect href="/" />;
  }

  const fillDemo = (role: "teacher" | "student") => {
    impactLight();
    setEmail(role === "teacher" ? "teacher@lms.local" : "student@lms.local");
    setPassword("Demo123!");
    setEmailError(null);
    setPasswordError(null);
    setFormError(null);
  };

  const clearErrors = () => {
    setEmailError(null);
    setPasswordError(null);
    setFormError(null);
  };

  const handleLogin = () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError("Vui lòng nhập địa chỉ email của bạn");
      setPasswordError(null);
      setFormError("Vui lòng nhập địa chỉ email của bạn");
      notifyError();
      return;
    }
    if (!password) {
      setEmailError(null);
      setPasswordError("Vui lòng nhập mật khẩu");
      setFormError("Vui lòng nhập mật khẩu");
      notifyError();
      return;
    }

    setBusy(true);
    clearErrors();

    void login(trimmedEmail, password)
      .then(() => notifySuccess())
      .catch((err: Error) => {
        notifyError();
        setFormError(userErrorMessage(err));
      })
      .finally(() => setBusy(false));
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={keyboardBehavior}
        style={styles.flex}
      >
        {formError ? (
          <View style={styles.noticeWrap}>
            <FormNotice message={formError} />
          </View>
        ) : null}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Branding Header */}
          <Animated.View entering={FadeInDown.duration(450).springify()} style={styles.header}>
            <View style={[styles.logoContainer, { backgroundColor: theme.colors.primaryContainer, borderColor: palette.primarySoft }]}>
              <View style={[styles.logoCircle, { backgroundColor: theme.colors.primary }]}>
                <Icon source="school" size={34} color="#FFFFFF" />
              </View>
            </View>

            <View style={[styles.pillBadge, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Icon source="book-open-page-variant-outline" size={13} color={theme.colors.primary} />
              <Text style={[styles.pillText, { color: theme.colors.primary }]}>
                LMS CLASSROOM
              </Text>
            </View>

            <Text style={[typography.title, styles.title, { color: theme.colors.onBackground }]}>
              Chào mừng trở lại
            </Text>
            <Text style={[typography.body, styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              Đăng nhập để vào không gian lớp học, bảng tin và bài tập
            </Text>
          </Animated.View>

          {/* Login Form Card */}
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
            {/* Email Field */}
            <View style={styles.inputGroup}>
              <TextInput
                testID="login-email"
                mode="outlined"
                label="Email"
                placeholder="email@school.edu.vn"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                error={Boolean(emailError)}
                onChangeText={(text) => {
                  setEmail(text);
                  clearErrors();
                }}
                left={<TextInput.Icon icon="email-outline" color={theme.colors.onSurfaceVariant} />}
                outlineStyle={styles.inputOutline}
                style={styles.textInput}
              />
              <FieldError message={emailError} />
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <TextInput
                testID="login-password"
                mode="outlined"
                label="Mật khẩu"
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                value={password}
                error={Boolean(passwordError)}
                onChangeText={(text) => {
                  setPassword(text);
                  clearErrors();
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
              <FieldError message={passwordError} />

              <View style={styles.forgotRow}>
                <Link href="/(auth)/forgot-password" asChild>
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
              testID="login-submit"
              accessibilityLabel="login-submit"
              loading={busy}
              disabled={busy}
              onPress={handleLogin}
              icon="login-variant"
              style={styles.loginBtn}
            >
              Đăng nhập
            </AppButton>

            {/* Demo Pills Section */}
            <View style={[styles.demoCard, { backgroundColor: theme.colors.surfaceVariant }]}>
              <View style={styles.demoHeader}>
                <Icon source="account-key-outline" size={15} color={theme.colors.primary} />
                <Text style={[styles.demoTitle, { color: theme.colors.onSurfaceVariant }]}>
                  Tài khoản dùng thử nhanh:
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
                  <Icon source="account-tie-outline" size={18} color={palette.teacher} />
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
                  <Icon source="school-outline" size={18} color={palette.student} />
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
              Chưa có tài khoản?{" "}
            </Text>
            <Link href="/(auth)/register" asChild>
              <Pressable hitSlop={8}>
                <Text style={[styles.registerLink, { color: theme.colors.primary }]}>
                  Đăng ký ngay
                </Text>
              </Pressable>
            </Link>
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
  noticeWrap: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 96,
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
    borderRadius: radius.pill,
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
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.xl,
    gap: spacing.md,
  },
  inputGroup: {
    gap: 4,
  },
  textInput: {
    backgroundColor: "transparent",
  },
  inputOutline: {
    borderRadius: radius.md,
  },
  forgotRow: {
    alignItems: "flex-end",
    marginTop: 4,
  },
  forgotText: {
    fontWeight: "600",
    minHeight: 44,
    lineHeight: 44,
  },
  loginBtn: {
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },
  demoCard: {
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.xs,
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
    gap: spacing.sm,
  },
  demoPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 6,
  },
  demoPillText: {
    fontSize: 13,
    fontWeight: "700",
  },
  pillPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.xl,
  },
  registerLink: {
    fontSize: 15,
    fontWeight: "700",
    minHeight: 44,
    lineHeight: 44,
  },
});
