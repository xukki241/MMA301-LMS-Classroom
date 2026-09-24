import { Link, Redirect } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  HelperText,
  Icon,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useAuth } from "@/src/lib/auth-context";
import { AppButton } from "@/src/components/ui/AppButton";
import { notifyError, notifySuccess } from "@/src/lib/haptics";
import { spacing, typography } from "@/src/theme/tokens";

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
    setEmail(role === "teacher" ? "teacher@lms.local" : "student@lms.local");
    setPassword("Demo123!");
    setError(null);
  };

  const handleLogin = () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Vui lòng nhập địa chỉ email");
      notifyError();
      return;
    }
    if (!password) {
      setError("Vui lòng nhập mật khẩu");
      notifyError();
      return;
    }

    setBusy(true);
    setError(null);

    void login(trimmedEmail, password)
      .then(() => notifySuccess())
      .catch((err: Error) => {
        notifyError();
        setError(err.message || "Đăng nhập không thành công");
      })
      .finally(() => setBusy(false));
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.header}>
          <View style={[styles.logoBadge, { backgroundColor: theme.colors.primaryContainer }]}>
            <Icon source="school-outline" size={38} color={theme.colors.primary} />
          </View>
          <Text style={[typography.title, styles.title]}>Chào mừng trở lại!</Text>
          <Text style={[typography.body, { color: theme.colors.onSurfaceVariant, textAlign: "center" }]}>
            Đăng nhập vào LMS Classroom để kết nối lớp học và tài liệu của bạn
          </Text>
        </Animated.View>

        {/* Form */}
        <Animated.View entering={FadeInDown.delay(100).duration(450).springify()} style={styles.formCard}>
          <TextInput
            mode="outlined"
            label="Địa chỉ Email"
            placeholder="example@school.edu.vn"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={(text) => { setEmail(text); if (error) setError(null); }}
            left={<TextInput.Icon icon="email-outline" />}
            outlineStyle={styles.inputOutline}
          />

          <View>
            <TextInput
              mode="outlined"
              label="Mật khẩu"
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(text) => { setPassword(text); if (error) setError(null); }}
              left={<TextInput.Icon icon="lock-outline" />}
              right={
                <TextInput.Icon
                  icon={showPassword ? "eye-off-outline" : "eye-outline"}
                  onPress={() => setShowPassword(!showPassword)}
                  forceTextInputFocus={false}
                />
              }
              outlineStyle={styles.inputOutline}
            />
            <View style={styles.forgotRow}>
              <Link href={"/(auth)/forgot-password" as any} style={styles.forgotLink}>
                <Text style={[typography.caption, { color: theme.colors.primary, fontWeight: "600" }]}>
                  Quên mật khẩu?
                </Text>
              </Link>
            </View>
          </View>

          <HelperText type="error" visible={Boolean(error)} style={styles.helperText}>
            {error}
          </HelperText>

          <AppButton
            loading={busy}
            disabled={busy}
            onPress={handleLogin}
            style={styles.mainBtn}
          >
            Đăng nhập
          </AppButton>

          {/* Tài khoản demo nhanh */}
          <View style={[styles.demoBox, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant, fontWeight: "600" }]}>
              Tài khoản demo:
            </Text>
            <View style={styles.demoButtons}>
              <AppButton mode="text" haptic={false} style={styles.demoBtnItem} onPress={() => fillDemo("teacher")}>
                👨‍🏫 Giáo viên
              </AppButton>
              <View style={styles.demoDivider} />
              <AppButton mode="text" haptic={false} style={styles.demoBtnItem} onPress={() => fillDemo("student")}>
                👨‍🎓 Học sinh
              </AppButton>
            </View>
          </View>

          <View style={styles.registerRow}>
            <Text style={[typography.body, { color: theme.colors.onSurfaceVariant }]}>
              Chưa có tài khoản?{" "}
            </Text>
            <Link href={"/(auth)/register" as any} style={[styles.registerLink, { color: theme.colors.primary }]}>
              Đăng ký ngay
            </Link>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
    gap: spacing.xs,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  formCard: { gap: spacing.md },
  inputOutline: { borderRadius: 14 },
  forgotRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  forgotLink: { paddingVertical: 4, paddingHorizontal: 2 },
  helperText: { marginTop: -8, marginBottom: -4 },
  mainBtn: { borderRadius: 14, paddingVertical: 4 },
  demoBox: {
    borderRadius: 14,
    padding: spacing.sm,
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  demoButtons: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    justifyContent: "space-around",
  },
  demoBtnItem: { flex: 1 },
  demoDivider: {
    width: 1,
    height: 18,
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  registerLink: { fontWeight: "700" },
});
