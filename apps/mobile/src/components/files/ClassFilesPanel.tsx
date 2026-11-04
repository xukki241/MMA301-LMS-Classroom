import { Alert, Linking, Pressable, StyleSheet, View } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Text, useTheme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/lib/auth-context";
import { deleteClassFile, formatBytes, listClassFiles } from "@/src/lib/files-api";
import { queryClient, queryKeys } from "@/src/lib/query-client";
import { notifyError, notifySuccess } from "@/src/lib/haptics";
import { userErrorMessage } from "@/src/lib/user-error-message";
import { ClassListSkeleton } from "@/src/components/ui/Skeleton";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { radius, spacing, typography } from "@/src/theme/tokens";

type Props = {
  classId: string;
  canDelete?: boolean;
};

export function ClassFilesPanel({ classId, canDelete }: Props) {
  const theme = useTheme();
  const { token, user } = useAuth();
  const query = useQuery({
    queryKey: queryKeys.classFiles(user?.id ?? "", classId),
    enabled: Boolean(token && user && classId),
    queryFn: ({ signal }) => listClassFiles(token!, classId, signal),
  });

  const removeMutation = useMutation({
    mutationFn: (fileId: string) => deleteClassFile(token!, classId, fileId),
    onSuccess: () => {
      notifySuccess();
      void queryClient.invalidateQueries({ queryKey: queryKeys.classFiles(user!.id, classId) });
    },
    onError: (err) => {
      notifyError();
      Alert.alert("Không xóa được", userErrorMessage(err));
    },
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={typography.subtitle}>Tệp Cloudinary trong lớp</Text>
        <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
          {(query.data ?? []).length} tệp
        </Text>
      </View>
      {query.isPending ? <ClassListSkeleton accessibilityLabel="Đang tải file" /> : null}
      {query.isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Không tải được danh sách file"
          subtitle={userErrorMessage(query.error)}
          actionLabel="Thử lại"
          onAction={() => void query.refetch()}
        />
      ) : null}
      {query.isSuccess && (query.data?.length ?? 0) === 0 ? (
        <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
          Chưa có file nào. Upload từ bài tập / bài nộp sẽ hiện ở đây.
        </Text>
      ) : null}
      {query.data?.map((file) => {
        const allowDelete = canDelete || file.uploadedBy === user?.id;
        return (
          <View
            key={file.id}
            style={[styles.row, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surface }]}
          >
            <Ionicons name="document-outline" size={20} color={theme.colors.primary} />
            <View style={styles.meta}>
              <Text style={typography.body} numberOfLines={1}>
                {file.originalFilename || file.publicId}
              </Text>
              <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
                {formatBytes(file.bytes)}
                {file.uploaderDisplayName ? ` · ${file.uploaderDisplayName}` : ""}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mở file"
              onPress={() => void Linking.openURL(file.url)}
              hitSlop={8}
              style={styles.iconBtn}
            >
              <Ionicons name="open-outline" size={18} color={theme.colors.primary} />
            </Pressable>
            {allowDelete ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Xóa file"
                onPress={() =>
                  Alert.alert("Xóa file Cloudinary?", file.originalFilename || "Tệp này", [
                    { text: "Hủy", style: "cancel" },
                    {
                      text: "Xóa",
                      style: "destructive",
                      onPress: () => removeMutation.mutate(file.id),
                    },
                  ])
                }
                hitSlop={8}
                style={styles.iconBtn}
              >
                <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginTop: spacing.md },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  meta: { flex: 1, gap: 2 },
  iconBtn: { minWidth: 40, minHeight: 40, alignItems: "center", justifyContent: "center" },
});
