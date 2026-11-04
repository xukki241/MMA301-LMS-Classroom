import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Text, useTheme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { uploadToCloudinary } from "@/src/lib/cloudinary";
import type { ClassFileItem } from "@/src/lib/files-api";
import { useAuth } from "@/src/lib/auth-context";
import { queryClient, queryKeys } from "@/src/lib/query-client";
import { notifyError, notifySuccess } from "@/src/lib/haptics";
import { userErrorMessage } from "@/src/lib/user-error-message";
import { radius, spacing, typography } from "@/src/theme/tokens";

type Props = {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  token?: string | null;
  classId?: string;
  purpose?: ClassFileItem["purpose"];
};

export function CloudinaryFilePicker({
  label = "Đính kèm file (Cloudinary)",
  value,
  onChange,
  disabled,
  token,
  classId,
  purpose = "other",
}: Props) {
  const theme = useTheme();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = async () => {
    if (disabled || busy) return;
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setBusy(true);
      const url = await uploadToCloudinary(
        {
          uri: asset.uri,
          name: asset.name || "file",
          mimeType: asset.mimeType || "application/octet-stream",
        },
        { token: token ?? undefined, classId, purpose },
      );
      setFileName(asset.name || "file");
      onChange(url);
      if (user?.id && classId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.classFiles(user.id, classId) });
      }
      notifySuccess();
    } catch (caught) {
      notifyError();
      setError(userErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled || busy}
        onPress={() => void pick()}
        style={({ pressed }) => [
          styles.zone,
          {
            borderColor: theme.colors.primary,
            backgroundColor: theme.colors.surface,
            opacity: pressed || busy ? 0.8 : 1,
          },
        ]}
      >
        <Ionicons name="cloud-upload-outline" size={26} color={theme.colors.primary} />
        <View style={styles.meta}>
          <Text style={typography.subtitle}>
            {busy ? "Đang tải lên Cloudinary…" : value ? "Đã đính kèm — chọn lại để thay" : "Chạm để chọn tệp"}
          </Text>
          <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]} numberOfLines={2}>
            {fileName || value || "PDF, ZIP, DOCX, ảnh… lưu trên Cloudinary"}
          </Text>
        </View>
      </Pressable>
      {error ? (
        <Text style={[typography.caption, { color: theme.colors.error }]}>{error}</Text>
      ) : null}
      {value ? (
        <View style={[styles.chip, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surfaceVariant }]}>
          <Ionicons name="document-attach-outline" size={16} color={theme.colors.primary} />
          <Text style={[typography.caption, styles.chipText]} numberOfLines={1}>
            {fileName || "Tệp đã tải lên"}
          </Text>
          <Pressable
            onPress={() => {
              onChange("");
              setFileName(null);
            }}
            hitSlop={8}
            accessibilityLabel="Gỡ file"
          >
            <Ionicons name="close-circle" size={18} color={theme.colors.error} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  zone: {
    minHeight: 88,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  meta: { flex: 1, gap: 2 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: { flex: 1 },
});
