import { Redirect, router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { HelperText, SegmentedButtons, Text, TextInput, useTheme } from "react-native-paper";
import { useAuth } from "@/src/lib/auth-context";
import { AppButton } from "@/src/components/ui/AppButton";
import { notifyError, notifySuccess } from "@/src/lib/haptics";
import { spacing, typography } from "@/src/theme/tokens";

export default function RegisterScreen() {
  const theme = useTheme();
  const { user, register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"teacher" | "student">("student");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) {
    return <Redirect href="/" />;
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
      <View style={[styles.wrap, { backgroundColor: theme.colors.background }]}>
        <Animated.View entering={FadeInDown.springify()} style={styles.hero}>
          <Text style={typography.title}>Tạo tài khoản</Text>
          <Text style={[typography.body, { color: theme.colors.onSurfaceVariant }]}>
            Chọn đúng vai trò — Teacher tạo lớp, Student tham gia bằng mã.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.form}>
          <TextInput mode="outlined" label="Họ tên" value={displayName} onChangeText={setDisplayName} />
          <TextInput
            mode="outlined"
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            mode="outlined"
            label="Mật khẩu (≥ 8 ký tự)"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <SegmentedButtons
            value={role}
            onValueChange={(value) => setRole(value as "teacher" | "student")}
            buttons={[
              { value: "student", label: "Student" },
              { value: "teacher", label: "Teacher" },
            ]}
          />
          <HelperText type="error" visible={Boolean(error)}>
            {error}
          </HelperText>
          <AppButton
            loading={busy}
            onPress={() => {
              setBusy(true);
              setError(null);
              void register({
                email: email.trim(),
                password,
                displayName: displayName.trim(),
                role,
              })
                .then(() => notifySuccess())
                .catch((err: Error) => {
                  notifyError();
                  setError(err.message);
                })
                .finally(() => setBusy(false));
            }}
          >
            Đăng ký
          </AppButton>
          <AppButton mode="text" haptic={false} onPress={() => router.back()}>
            Đã có tài khoản
          </AppButton>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { flex: 1, padding: spacing.xxl, justifyContent: "center", gap: spacing.xl },
  hero: { gap: spacing.sm },
  form: { gap: spacing.sm },
});
