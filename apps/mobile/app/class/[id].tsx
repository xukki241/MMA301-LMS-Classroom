import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useState, type ComponentProps } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { useQuery, useMutation } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Dialog, Portal, Text, TextInput, useTheme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ClassListSkeleton } from "@/src/components/ui/Skeleton";
import { ErrorState } from "@/src/components/ui/EmptyState";
import { AppButton } from "@/src/components/ui/AppButton";
import { CachedAvatar } from "@/src/components/ui/CachedAvatar";
import { useAuth } from "@/src/lib/auth-context";
import { getClass, type LmsClass } from "@/src/lib/classes-api";
import { queryClient, queryKeys } from "@/src/lib/query-client";
import { isNotFound } from "@/src/lib/http";
import { impactLight, notifyError, notifySuccess } from "@/src/lib/haptics";
import { elevation, palette, radius, spacing, typography } from "@/src/theme/tokens";
import { http } from "@/src/lib/http";
import { CORE_URL } from "@/src/lib/config";

function ModuleCard({
  icon,
  title,
  subtitle,
  onPress,
  disabled,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => {
        if (onPress && !disabled) {
          impactLight();
          onPress();
        }
      }}
      disabled={!onPress || disabled}
      style={({ pressed }) => [
        styles.module,
        elevation.card,
        {
          backgroundColor: disabled ? theme.colors.surfaceVariant : theme.colors.surface,
          borderColor: theme.colors.outline,
          opacity: disabled ? 0.5 : 1,
        },
        pressed && !disabled && styles.modulePressed,
      ]}
    >
      <Ionicons
        name={icon}
        size={22}
        color={disabled ? theme.colors.onSurfaceVariant : theme.colors.primary}
      />
      <View style={styles.moduleMeta}>
        <Text style={typography.subtitle}>{title}</Text>
        <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>{subtitle}</Text>
      </View>
      {Boolean(onPress) && !disabled && (
        <Ionicons name="chevron-forward" size={18} color={theme.colors.onSurfaceVariant} />
      )}
    </Pressable>
  );
}

export default function ClassDetailScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { token, user } = useAuth();
  const { id, name, code } = useLocalSearchParams<{ id: string; name?: string; code?: string }>();
  const classId = Array.isArray(id) ? id[0] : id;
  const isTeacher = user?.role === "teacher";

  // Rename state
  const [renameVisible, setRenameVisible] = useState(false);
  const [newName, setNewName] = useState("");

  const cached = (queryClient.getQueryData<LmsClass[]>(queryKeys.classes) ?? []).find(
    (item) => item.id === classId
  );

  const query = useQuery({
    queryKey: queryKeys.class(classId ?? ""),
    enabled: Boolean(token && classId),
    queryFn: ({ signal }) => getClass(token!, classId!, signal),
    placeholderData: cached,
  });

  const item = query.data;
  const title = item?.name ?? (Array.isArray(name) ? name[0] : name) ?? "Chi tiết lớp";
  const classCode = item?.code ?? (Array.isArray(code) ? code[0] : code) ?? "—";

  useEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  // Delete class mutation
  const deleteMutation = useMutation({
    mutationFn: () =>
      http<{ message: string }>(`${CORE_URL}/classes/${classId}`, {
        method: "DELETE",
        token: token!,
      }),
    onSuccess: () => {
      notifySuccess();
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes });
      router.replace("/(teacher)/classes");
    },
    onError: (err: Error) => {
      notifyError();
      Alert.alert("Lỗi", err.message || "Không thể xóa lớp học");
    },
  });

  // Rename mutation
  const renameMutation = useMutation({
    mutationFn: (updatedName: string) =>
      http<{ message: string; class: LmsClass }>(`${CORE_URL}/classes/${classId}`, {
        method: "PATCH",
        token: token!,
        body: { name: updatedName },
      }),
    onSuccess: () => {
      notifySuccess();
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes });
      void queryClient.invalidateQueries({ queryKey: queryKeys.class(classId!) });
      setRenameVisible(false);
      setNewName("");
    },
    onError: (err: Error) => {
      notifyError();
      Alert.alert("Lỗi", err.message || "Không thể đổi tên lớp");
    },
  });

  const handleDeleteConfirm = () => {
    impactLight();
    Alert.alert(
      "Xóa lớp học?",
      `Lớp "${title}" sẽ bị xóa vĩnh viễn cùng toàn bộ tài liệu và bài tập. Thao tác này không thể hoàn tác!`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa lớp",
          style: "destructive",
          onPress: () => deleteMutation.mutate(),
        },
      ]
    );
  };

  const handleRenameOpen = () => {
    impactLight();
    setNewName(title);
    setRenameVisible(true);
  };

  const handleRenameSubmit = () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      Alert.alert("Lỗi", "Tên lớp không được để trống");
      return;
    }
    renameMutation.mutate(trimmed);
  };

  if (query.isPending && !cached) {
    return (
      <Screen>
        <ClassListSkeleton />
      </Screen>
    );
  }

  if (query.isError && !isNotFound(query.error) && !cached) {
    return (
      <Screen>
        <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen>
      {/* Hero */}
      <Animated.View entering={FadeInDown.springify()} style={styles.hero}>
        <CachedAvatar label={title} size={56} />
        <Text style={typography.title}>{title}</Text>
        <Text style={[typography.body, { color: theme.colors.onSurfaceVariant }]}>
          Mã tham gia · {classCode}
        </Text>
        {isNotFound(query.error) ? (
          <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
            Chi tiết API chưa sẵn — đang hiện dữ liệu từ danh sách.
          </Text>
        ) : null}
      </Animated.View>

      {/* Modules */}
      <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.modules}>
        <ModuleCard icon="newspaper-outline" title="Bảng tin" subtitle="Post + comment — thảo luận lớp học" />
        <ModuleCard
          icon="document-text-outline"
          title="Tài liệu"
          subtitle="Xem & chia sẻ liên kết tài liệu học tập"
          onPress={() => {
            router.push({
              pathname: "/class/[id]/materials" as any,
              params: { id: classId, name: title },
            });
          }}
        />
        <ModuleCard
          icon="create-outline"
          title="Bài tập"
          subtitle="Giao bài, theo dõi hạn nộp và điểm số"
          onPress={() => {
            router.push({
              pathname: "/class/[id]/assignments" as any,
              params: { id: classId, name: title },
            });
          }}
        />
      </Animated.View>

      {/* Teacher actions */}
      {isTeacher && (
        <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.teacherSection}>
          <Text style={[typography.label, { color: theme.colors.onSurfaceVariant, marginBottom: spacing.sm }]}>
            QUẢN LÝ LỚP HỌC
          </Text>

          {/* Rename */}
          <Pressable
            onPress={handleRenameOpen}
            style={({ pressed }) => [
              styles.actionRow,
              elevation.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <View style={[styles.actionIcon, { backgroundColor: `${palette.primary}15` }]}>
              <Ionicons name="pencil-outline" size={18} color={palette.primary} />
            </View>
            <Text style={[typography.subtitle, { flex: 1 }]}>Đổi tên lớp</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.onSurfaceVariant} />
          </Pressable>

          {/* Delete */}
          <Pressable
            onPress={handleDeleteConfirm}
            disabled={deleteMutation.isPending}
            style={({ pressed }) => [
              styles.actionRow,
              elevation.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: `${palette.danger}40`,
                opacity: pressed || deleteMutation.isPending ? 0.7 : 1,
              },
            ]}
          >
            <View style={[styles.actionIcon, { backgroundColor: palette.dangerSoft }]}>
              <Ionicons name="trash-outline" size={18} color={palette.danger} />
            </View>
            <Text style={[typography.subtitle, { flex: 1, color: palette.danger }]}>
              {deleteMutation.isPending ? "Đang xóa..." : "Xóa lớp học"}
            </Text>
            {!deleteMutation.isPending && (
              <Ionicons name="chevron-forward" size={16} color={palette.danger} />
            )}
          </Pressable>
        </Animated.View>
      )}

      {/* Rename Dialog */}
      <Portal>
        <Dialog
          visible={renameVisible}
          onDismiss={() => setRenameVisible(false)}
          style={[styles.dialog, { backgroundColor: theme.colors.surface }]}
        >
          <Dialog.Title>Đổi tên lớp học</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Tên lớp mới"
              value={newName}
              onChangeText={setNewName}
              autoFocus
              outlineStyle={{ borderRadius: 12 }}
              style={{ backgroundColor: "transparent" }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <AppButton mode="text" onPress={() => setRenameVisible(false)} disabled={renameMutation.isPending}>
              Hủy
            </AppButton>
            <AppButton
              mode="contained"
              loading={renameMutation.isPending}
              disabled={renameMutation.isPending}
              onPress={handleRenameSubmit}
            >
              Lưu
            </AppButton>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.lg },
  modules: { gap: spacing.md, marginTop: spacing.md },
  module: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modulePressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  moduleMeta: { flex: 1, gap: 2 },
  teacherSection: { marginTop: spacing.xl, gap: spacing.sm },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  dialog: { borderRadius: 20 },
});
