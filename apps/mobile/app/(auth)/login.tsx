import { Link, Redirect } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { HelperText, Text, TextInput, useTheme } from "react-native-paper";
import { useAuth } from "@/src/lib/auth-context";
import { AppButton } from "@/src/components/ui/AppButton";
import { notifyError, notifySuccess } from "@/src/lib/haptics";
import { spacing, typography } from "@/src/theme/tokens";

export default function LoginScreen() {
  const theme = useTheme();
  const { user, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
      <View style={[styles.wrap, { backgroundColor: theme.colors.background }]}>
        <Animated.View entering={FadeInDown.springify()} style={styles.hero}>
          <Text style={typography.display}>LMS Classroom</Text>
          <Text style={[typography.body, { color: theme.colors.onSurfaceVariant }]}>
            Đăng nhập để vào lớp học, bảng tin và bài tập.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.form}>
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
            label="Mật khẩu"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <HelperText type="error" visible={Boolean(error)}>
            {error}
          </HelperText>
          <AppButton
            loading={busy}
            onPress={() => {
              setBusy(true);
              setError(null);
              void login(email.trim(), password)
                .then(() => notifySuccess())
                .catch((err: Error) => {
                  notifyError();
                  setError(err.message);
                })
                .finally(() => setBusy(false));
            }}
          >
            Đăng nhập
          </AppButton>
          <View style={styles.demoRow}>
            <AppButton mode="contained-tonal" haptic={false} onPress={() => fillDemo("teacher")}>
              Demo GV
            </AppButton>
            <AppButton mode="contained-tonal" haptic={false} onPress={() => fillDemo("student")}>
              Demo HS
            </AppButton>
          </View>
          <Link href="/(auth)/register" style={[styles.link, { color: theme.colors.primary }]}>
            Chưa có tài khoản? Đăng ký
          </Link>
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
  demoRow: { flexDirection: "row", gap: spacing.sm },
  link: { marginTop: spacing.sm, fontWeight: "600" },
});
