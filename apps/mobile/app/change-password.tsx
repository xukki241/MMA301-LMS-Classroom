// Change password route - secure password update form
import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { Text, TextInput, useTheme } from "react-native-paper";
import { useNavigation, useRouter } from "expo-router";
import { Screen } from "@/src/components/ui/Screen";
import { AppButton } from "@/src/components/ui/AppButton";
import { FieldError, FormNotice } from "@/src/components/ui/FormFeedback";
import { useAuth } from "@/src/lib/auth-context";
import { changePassword } from "@/src/lib/api";
import { notifyError, notifySuccess } from "@/src/lib/haptics";
import { userErrorMessage } from "@/src/lib/user-error-message";
import { spacing, typography } from "@/src/theme/tokens";

export default function ChangePasswordScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const router = useRouter();
  const { token } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: "Đổi mật khẩu" });
  }, [navigation]);

  const onSubmit = async () => {
    if (newPassword.length < 8) {
      setFieldError("Mật khẩu mới cần ít nhất 8 ký tự");
      notifyError();
      return;
    }
    if (newPassword !== confirm) {
      setFieldError("Xác nhận mật khẩu không khớp");
      notifyError();
      return;
    }
    if (!token) return;
    setBusy(true);
    setError(null);
    setFieldError(null);
    try {
      await changePassword(token, { currentPassword, newPassword });
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
        Nhập mật khẩu hiện tại và mật khẩu mới để cập nhật.
      </Text>
      {error ? <FormNotice message={error} /> : null}

      <TextInput
        mode="outlined"
        label="Mật khẩu hiện tại"
        secureTextEntry
        value={currentPassword}
        onChangeText={setCurrentPassword}
        style={styles.input}
      />
      <TextInput
        mode="outlined"
        label="Mật khẩu mới"
        secureTextEntry
        value={newPassword}
        onChangeText={(value) => {
          setNewPassword(value);
          setFieldError(null);
        }}
        style={styles.input}
      />
      <TextInput
        mode="outlined"
        label="Xác nhận mật khẩu mới"
        secureTextEntry
        value={confirm}
        onChangeText={(value) => {
          setConfirm(value);
          setFieldError(null);
        }}
        style={styles.input}
      />
      <FieldError message={fieldError} />

      <AppButton loading={busy} onPress={() => void onSubmit()} style={styles.save}>
        Đổi mật khẩu
      </AppButton>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: spacing.lg },
  input: { marginBottom: spacing.md },
  save: { marginTop: spacing.md },
});
