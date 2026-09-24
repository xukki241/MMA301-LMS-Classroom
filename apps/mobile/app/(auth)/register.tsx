import { Link, Redirect, router } from "expo-router";
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

export default function RegisterScreen() {
  const theme = useTheme();
  const { user, register } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<"teacher" | "student">("student");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Redirect href="/" />;

  const validate = () => {
    if (displayName.trim().length < 2) return "Họ và tên cần có ít nhất 2 ký tự";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Địa chỉ email không đúng định dạng";
    if (password.length < 8) return "Mật khẩu phải chứa ít nhất 8 ký tự";
    if (password !== confirmPassword) return "Mật khẩu xác nhận không khớp";
    return null;
  };

  const handleRegister = () => {
    const err = validate();
    if (err) {
      setError(err);
      notifyError();
      return;
    }

    setBusy(true);
    setError(null);
    void register({ email: email.trim(), password, displayName: displayName.trim(), role })
      .then(() => notifySuccess())
      .catch((e: Error) => {
        notifyError();
        setError(e.message || "Đăng ký không thành công, vui lòng thử lại");
      })
      .finally(() => setBusy(false));
  };

  const selectRole = (newRole: "teacher" | "student") => {
    impactLight();
    setRole(newRole);
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
                <Icon source="account-plus-outline" size={32} color="#FFFFFF" />
              </View>
            </View>

            <View style={[styles.pillBadge, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Icon source="school-outline" size={13} color={theme.colors.primary} />
              <Text style={[styles.pillText, { color: theme.colors.primary }]}>
                THÀNH VIÊN MỚI
              </Text>
            </View>

            <Text style={[typography.title, styles.title, { color: theme.colors.onBackground }]}>
              Tạo tài khoản LMS 🚀
            </Text>
            <Text style={[typography.body, styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              Đăng ký để tham gia lớp học và bắt đầu trải nghiệm học tập cùng LMS
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

            {/* Role Selection Label */}
            <View style={styles.roleHeader}>
              <Text style={[typography.caption, styles.roleLabel, { color: theme.colors.onSurfaceVariant }]}>
                BẠN THAM GIA VỚI VAI TRÒ:
              </Text>
            </View>

            {/* Interactive Role Cards */}
            <View style={styles.roleCardsRow}>
              {/* Student Card */}
              <Pressable
                onPress={() => selectRole("student")}
                style={({ pressed }) => [
                  styles.roleCard,
                  {
                    backgroundColor: role === "student" ? theme.colors.primaryContainer : theme.colors.surfaceVariant,
                    borderColor: role === "student" ? theme.colors.primary : theme.colors.outline,
                    borderWidth: role === "student" ? 2 : 1,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.roleCardTop}>
                  <Text style={styles.roleEmoji}>👨‍🎓</Text>
                  {role === "student" && (
                    <Icon source="check-circle" size={18} color={theme.colors.primary} />
                  )}
                </View>
                <Text style={[styles.roleTitle, { color: role === "student" ? theme.colors.primary : theme.colors.onSurface }]}>
                  Học sinh
                </Text>
                <Text style={[styles.roleDesc, { color: theme.colors.onSurfaceVariant }]}>
                  Tham gia lớp & nộp bài
                </Text>
              </Pressable>

              {/* Teacher Card */}
              <Pressable
                onPress={() => selectRole("teacher")}
                style={({ pressed }) => [
                  styles.roleCard,
                  {
                    backgroundColor: role === "teacher" ? theme.colors.primaryContainer : theme.colors.surfaceVariant,
                    borderColor: role === "teacher" ? palette.teacher : theme.colors.outline,
                    borderWidth: role === "teacher" ? 2 : 1,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.roleCardTop}>
                  <Text style={styles.roleEmoji}>👨‍🏫</Text>
                  {role === "teacher" && (
                    <Icon source="check-circle" size={18} color={palette.teacher} />
                  )}
                </View>
                <Text style={[styles.roleTitle, { color: role === "teacher" ? palette.teacher : theme.colors.onSurface }]}>
                  Giáo viên
                </Text>
                <Text style={[styles.roleDesc, { color: theme.colors.onSurfaceVariant }]}>
                  Quản lý lớp & chấm bài
                </Text>
              </Pressable>
            </View>

            {/* Full Name */}
            <View style={styles.inputGroup}>
              <TextInput
                mode="outlined"
                label="Họ và tên"
                placeholder="Nguyễn Văn A"
                value={displayName}
                onChangeText={(t) => {
                  setDisplayName(t);
                  if (error) setError(null);
                }}
                left={<TextInput.Icon icon="account-outline" color={theme.colors.onSurfaceVariant} />}
                outlineStyle={styles.inputOutline}
                style={styles.textInput}
              />
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <TextInput
                mode="outlined"
                label="Địa chỉ Email"
                placeholder="example@school.edu.vn"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (error) setError(null);
                }}
                left={<TextInput.Icon icon="email-outline" color={theme.colors.onSurfaceVariant} />}
                outlineStyle={styles.inputOutline}
                style={styles.textInput}
              />
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <TextInput
                mode="outlined"
                label="Mật khẩu"
                placeholder="Tối thiểu 8 ký tự"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (error) setError(null);
                }}
                left={<TextInput.Icon icon="lock-outline" color={theme.colors.onSurfaceVariant} />}
                right={
                  <TextInput.Icon
                    icon={showPassword ? "eye-off-outline" : "eye-outline"}
                    color={theme.colors.onSurfaceVariant}
                    onPress={() => setShowPassword((p) => !p)}
                    forceTextInputFocus={false}
                  />
                }
                outlineStyle={styles.inputOutline}
                style={styles.textInput}
              />
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <TextInput
                mode="outlined"
                label="Xác nhận mật khẩu"
                placeholder="Nhập lại mật khẩu ở trên"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={(t) => {
                  setConfirmPassword(t);
                  if (error) setError(null);
                }}
                left={<TextInput.Icon icon="lock-check-outline" color={theme.colors.onSurfaceVariant} />}
                right={
                  <TextInput.Icon
                    icon={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                    color={theme.colors.onSurfaceVariant}
                    onPress={() => setShowConfirmPassword((p) => !p)}
                    forceTextInputFocus={false}
                  />
                }
                outlineStyle={styles.inputOutline}
                style={styles.textInput}
              />
            </View>

            {/* Password Hint */}
            <View style={styles.hintRow}>
              <Icon source="information-outline" size={14} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.hintText, { color: theme.colors.onSurfaceVariant }]}>
                Mật khẩu bao gồm ít nhất 8 ký tự
              </Text>
            </View>

            {/* Submit Button */}
            <AppButton
              loading={busy}
              disabled={busy}
              onPress={handleRegister}
              icon="account-check-outline"
              style={styles.submitBtn}
            >
              Đăng ký tài khoản ngay
            </AppButton>
          </Animated.View>

          {/* Footer Login Link */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(450).springify()}
            style={styles.footer}
          >
            <Text style={[typography.body, { color: theme.colors.onSurfaceVariant }]}>
              Đã có tài khoản LMS?{" "}
            </Text>
            <Link href={"/(auth)/login" as any} asChild>
              <Pressable hitSlop={8}>
                <Text style={[styles.loginLink, { color: theme.colors.primary }]}>
                  Đăng nhập ngay
                </Text>
              </Pressable>
            </Link>
          </Animated.View>

          {/* Bottom Security Slogan */}
          <View style={styles.bottomSlogan}>
            <Icon source="shield-check-outline" size={14} color={palette.inkFaint} />
            <Text style={styles.sloganText}>
              Bảo mật và an toàn cho học tập & giảng dạy
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
  roleHeader: {
    marginTop: -2,
    marginBottom: -4,
  },
  roleLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  roleCardsRow: {
    flexDirection: "row",
    gap: 12,
  },
  roleCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  roleCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  roleEmoji: {
    fontSize: 22,
  },
  roleTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  roleDesc: {
    fontSize: 11,
    fontWeight: "500",
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
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: -4,
    paddingHorizontal: 4,
  },
  hintText: {
    fontSize: 12,
  },
  submitBtn: {
    borderRadius: 14,
    paddingVertical: 4,
    marginTop: 4,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.xl,
  },
  loginLink: {
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
