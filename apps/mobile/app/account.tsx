// Account settings route - shared settings for both roles
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text, TextInput, useTheme } from "react-native-paper";
import { useNavigation, useRouter } from "expo-router";
import { Screen } from "@/src/components/ui/Screen";
import { AppButton } from "@/src/components/ui/AppButton";
import { FieldError, FormNotice } from "@/src/components/ui/FormFeedback";
import { useAuth } from "@/src/lib/auth-context";
import { updateAuthProfile } from "@/src/lib/api";
import { notifyError, notifySuccess } from "@/src/lib/haptics";
import { userErrorMessage } from "@/src/lib/user-error-message";
import { spacing, typography } from "@/src/theme/tokens";

export default function AccountScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const router = useRouter();
  const { token, user, refreshSession } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: "Thông tin cá nhân" });
  }, [navigation]);

  useEffect(() => {
    setDisplayName(user?.displayName ?? "");
  }, [user?.displayName]);

  const onSave = async () => {
    const trimmed = displayName.trim();
    if (trimmed.length < 2 || trimmed.length > 80) {
      setFieldError("Tên hiển thị cần 2–80 ký tự");
      notifyError();
      return;
    }
    if (!token) return;
    setBusy(true);
    setError(null);
    setFieldError(null);
    try {
      const result = await updateAuthProfile(token, trimmed);
      await refreshSession(result.token, result.user);
      notifySuccess();
      router.back();
    } catch (err) {
      notifyError();
      setError(userErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Text style={[typography.body, styles.intro, { color: theme.colors.onSurfaceVariant }]}>
        Xem thông tin tài khoản và cập nhật tên hiển thị.
      </Text>
      {error ? <FormNotice message={error} /> : null}

      <View style={styles.block}>
        <Text style={typography.label}>EMAIL</Text>
        <Text style={typography.body} selectable>
          {user?.email}
        </Text>
      </View>
      <View style={styles.block}>
        <Text style={typography.label}>VAI TRÒ</Text>
        <Text style={typography.body}>{user?.role === "teacher" ? "Giáo viên" : "Học sinh"}</Text>
      </View>

      <TextInput
        mode="outlined"
        label="Tên hiển thị"
        value={displayName}
        onChangeText={(value) => {
          setDisplayName(value);
          setFieldError(null);
        }}
        error={Boolean(fieldError)}
        style={styles.input}
      />
      <FieldError message={fieldError} />

      <AppButton loading={busy} onPress={() => void onSave()} style={styles.save}>
        Lưu thay đổi
      </AppButton>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: spacing.lg },
  block: { gap: spacing.xs, marginBottom: spacing.lg },
  input: { marginBottom: spacing.sm },
  save: { marginTop: spacing.md },
});
