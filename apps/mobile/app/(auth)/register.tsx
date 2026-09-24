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
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useAuth } from "@/src/lib/auth-context";
import { AppButton } from "@/src/components/ui/AppButton";
import { notifyError, notifySuccess } from "@/src/lib/haptics";
import { spacing, typography } from "@/src/theme/tokens";

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
    if (displayName.trim().length < 2) return "Họ tên cần tối thiểu 2 ký tự";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Địa chỉ email không đúng định dạng";
    if (password.length < 8) return "Mật khẩu phải chứa ít nhất 8 ký tự";
    if (password !== confirmPassword) return "Mật khẩu xác nhận không trùng khớp";
    return null;
  };

  const handleRegister = () => {
    const err = validate();
    if (err) { setError(err); notifyError(); return; }

    setBusy(true);
    setError(null);
    void register({ email: email.trim(), password, displayName: displayName.trim(), role })
      .then(() => notifySuccess())
      .catch((e: Error) => { notifyError(); setError(e.message || "Đăng ký không thành công"); })
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
            <Icon source="account-plus-outline" size={38} color={theme.colors.primary} />
          </View>
          <Text style={[typography.title, styles.title]}>Tạo tài khoản mới</Text>
          <Text style={[typography.body, { color: theme.colors.onSurfaceVariant, textAlign: "center" }]}>
            Tham gia cộng đồng LMS Classroom để học tập và giảng dạy
          </Text>
        </Animated.View>

        {/* Form */}
        <Animated.View entering={FadeInDown.delay(100).duration(450).springify()} style={styles.formCard}>
          {/* Chọn vai trò */}
          <SegmentedButtons
            value={role}
            onValueChange={(v) => setRole(v as "teacher" | "student")}
            buttons={[
              { value: "student", label: "Học sinh", icon: "school-outline" },
              { value: "teacher", label: "Giáo viên", icon: "teach" },
            ]}
            style={styles.segmented}
          />

          <TextInput
            mode="outlined"
            label="Họ và tên"
            placeholder="Nguyễn Văn A"
            value={displayName}
            onChangeText={(t) => { setDisplayName(t); if (error) setError(null); }}
            left={<TextInput.Icon icon="account-outline" />}
            outlineStyle={styles.outline}
          />

          <TextInput
            mode="outlined"
            label="Địa chỉ Email"
            placeholder="example@school.edu.vn"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={(t) => { setEmail(t); if (error) setError(null); }}
            left={<TextInput.Icon icon="email-outline" />}
            outlineStyle={styles.outline}
          />

          <TextInput
            mode="outlined"
            label="Mật khẩu (≥ 8 ký tự)"
            placeholder="••••••••"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={(t) => { setPassword(t); if (error) setError(null); }}
            left={<TextInput.Icon icon="lock-outline" />}
            right={
              <TextInput.Icon
                icon={showPassword ? "eye-off-outline" : "eye-outline"}
                onPress={() => setShowPassword((p) => !p)}
                forceTextInputFocus={false}
              />
            }
            outlineStyle={styles.outline}
          />

          <TextInput
            mode="outlined"
            label="Xác nhận mật khẩu"
            placeholder="••••••••"
            secureTextEntry={!showConfirmPassword}
            value={confirmPassword}
            onChangeText={(t) => { setConfirmPassword(t); if (error) setError(null); }}
            left={<TextInput.Icon icon="lock-check-outline" />}
            right={
              <TextInput.Icon
                icon={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                onPress={() => setShowConfirmPassword((p) => !p)}
                forceTextInputFocus={false}
              />
            }
            outlineStyle={styles.outline}
          />

          <HelperText type="error" visible={Boolean(error)} style={styles.helper}>
            {error}
          </HelperText>

          <AppButton loading={busy} disabled={busy} onPress={handleRegister} style={styles.btn}>
            Đăng ký tài khoản
          </AppButton>

          <View style={styles.loginRow}>
            <Text style={[typography.body, { color: theme.colors.onSurfaceVariant }]}>
              Đã có tài khoản?{" "}
            </Text>
            <Link href={"/(auth)/login" as any} style={[styles.loginLink, { color: theme.colors.primary }]}>
              Đăng nhập ngay
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
  header: { alignItems: "center", marginBottom: spacing.xl, gap: spacing.xs },
  logoBadge: {
    width: 72, height: 72, borderRadius: 24,
    justifyContent: "center", alignItems: "center", marginBottom: spacing.sm,
  },
  title: { fontSize: 26, fontWeight: "700", letterSpacing: -0.5 },
  formCard: { gap: spacing.md },
  segmented: { borderRadius: 14 },
  outline: { borderRadius: 14 },
  helper: { marginTop: -8, marginBottom: -4 },
  btn: { borderRadius: 14, paddingVertical: 4 },
  loginRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: spacing.xs },
  loginLink: { fontWeight: "700" },
});
