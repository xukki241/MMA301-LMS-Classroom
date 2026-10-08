import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Dialog, FAB, Portal, Text, TextInput, useTheme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ClassListSkeleton } from "@/src/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/src/components/ui/EmptyState";
import { AppButton } from "@/src/components/ui/AppButton";
import { useAuth } from "@/src/lib/auth-context";
import { userErrorMessage } from "@/src/lib/user-error-message";
import {
  createExercise,
  defaultDueAtIso,
  isExerciseOpen,
  listExercises,
  type LmsExercise,
} from "@/src/lib/exercises-api";
import { queryClient, queryKeys } from "@/src/lib/query-client";
import { impactLight, notifyError, notifySuccess } from "@/src/lib/haptics";
import { elevation, palette, radius, spacing, typography } from "@/src/theme/tokens";

function formatDue(dueAt: string) {
  return new Date(dueAt).toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" });
}

function ExerciseCard({
  item,
  onPress,
}: {
  item: LmsExercise;
  onPress: () => void;
}) {
  const theme = useTheme();
  const open = isExerciseOpen(item.dueAt);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Mở bài tập ${item.title}`}
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <View
        style={[
          styles.card,
          elevation.card,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
        ]}
      >
        <View style={styles.cardHeader}>
          <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
          <View style={[styles.statusPill, { backgroundColor: open ? theme.colors.primaryContainer : theme.colors.surfaceVariant }]}>
            <Text style={[styles.statusText, { color: open ? palette.success : theme.colors.onSurfaceVariant }]}>
              {open ? "Đang mở" : "Đã hết hạn"}
            </Text>
          </View>
        </View>
        <Text style={typography.subtitle}>{item.title}</Text>
        {item.description ? (
          <Text numberOfLines={2} style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
            {item.description}
          </Text>
        ) : null}
        <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
          Hạn nộp · {formatDue(item.dueAt)}
        </Text>
        <Text style={[typography.caption, { color: theme.colors.primary, marginTop: spacing.xs }]}>
          Nhấn để xem chi tiết
        </Text>
      </View>
    </Pressable>
  );
}

export default function ExercisesScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const router = useRouter();
  const { token, user } = useAuth();
  const { id, name } = useLocalSearchParams<{ id?: string; name?: string }>();
  const classId = Array.isArray(id) ? id[0] : id;
  const className = Array.isArray(name) ? name[0] : name;
  const isTeacher = user?.role === "teacher";

  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState(defaultDueAtIso());
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({
      title: className ? `Bài tập · ${className}` : "Bài tập",
    });
  }, [navigation, className]);

  const query = useQuery({
    queryKey: queryKeys.exercises(user?.id ?? "", classId ?? ""),
    enabled: Boolean(token && user && classId),
    queryFn: ({ signal }) => listExercises(token!, classId!, signal),
  });

  const createMutation = useMutation({
    mutationFn: (payload: { title: string; description: string; dueAt: string }) =>
      createExercise(token!, classId!, payload),
    onSuccess: () => {
      notifySuccess();
      void queryClient.invalidateQueries({ queryKey: queryKeys.exercises(user!.id, classId!) });
      closeModal();
    },
    onError: (err: Error) => {
      notifyError();
      setFormError(err.message || "Không thể tạo bài tập");
    },
  });

  const closeModal = () => {
    setModalVisible(false);
    setTitle("");
    setDescription("");
    setDueAt(defaultDueAtIso());
    setFormError(null);
  };

  const handleCreate = () => {
    if (!title.trim()) {
      setFormError("Vui lòng nhập tiêu đề bài tập");
      notifyError();
      return;
    }
    setFormError(null);
    createMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      dueAt,
    });
  };

  if (!classId) {
    return (
      <Screen>
        <ErrorState message="Không tìm thấy lớp học." />
      </Screen>
    );
  }

  const exercises = query.data ?? [];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {query.isPending ? (
        <Screen>
          <ClassListSkeleton accessibilityLabel="Đang tải danh sách bài tập" />
        </Screen>
      ) : query.isError ? (
        <Screen>
          <ErrorState message={userErrorMessage(query.error)} onRetry={() => void query.refetch()} />
        </Screen>
      ) : exercises.length === 0 ? (
        <Screen
          refreshControl={
            <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
          }
        >
          <EmptyState
            icon="create-outline"
            title="Chưa có bài tập"
            subtitle={
              isTeacher
                ? "Tạo bài tập với hạn nộp để học sinh nộp bài trực tuyến."
                : "Giáo viên chưa giao bài tập cho lớp này."
            }
            actionLabel={isTeacher ? "Tạo bài tập" : undefined}
            onAction={isTeacher ? () => setModalVisible(true) : undefined}
          />
        </Screen>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollList}
          refreshControl={
            <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
          }
        >
          <View style={styles.headerInfo}>
            <Text style={typography.subtitle}>{exercises.length} bài tập</Text>
          </View>
          <View style={styles.cardList}>
            {exercises.map((item, index) => (
              <Animated.View key={item.id} entering={FadeInDown.delay(index * 50).springify()}>
                <ExerciseCard
                  item={item}
                  onPress={() => {
                    impactLight();
                    router.push({
                      pathname: "/class/[id]/exercise/[exerciseId]",
                      params: { id: classId, exerciseId: item.id, title: item.title },
                    });
                  }}
                />
              </Animated.View>
            ))}
          </View>
        </ScrollView>
      )}

      {isTeacher ? (
        <FAB
          testID="fab-create-exercise"
          icon="plus"
          label="Tạo bài tập"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          color="#FFFFFF"
          onPress={() => {
            impactLight();
            setModalVisible(true);
          }}
        />
      ) : null}

      <Portal>
        <Dialog visible={modalVisible} onDismiss={closeModal} style={{ backgroundColor: theme.colors.surface }}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <Dialog.Title>Tạo bài tập mới</Dialog.Title>
            <Dialog.Content style={{ gap: spacing.sm }}>
              {formError ? (
                <Text style={{ color: palette.danger, fontSize: 13 }}>{formError}</Text>
              ) : null}
              <TextInput mode="outlined" label="Tiêu đề *" value={title} onChangeText={setTitle} />
              <TextInput
                mode="outlined"
                label="Mô tả"
                multiline
                value={description}
                onChangeText={setDescription}
              />
              <TextInput
                mode="outlined"
                label="Hạn nộp (ISO UTC)"
                value={dueAt}
                onChangeText={setDueAt}
                autoCapitalize="none"
              />
              <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
                Mặc định cộng 7 ngày. Hạn nộp phải là chuỗi ISO 8601 có múi giờ và nằm trong tương lai.
              </Text>
            </Dialog.Content>
            <Dialog.Actions>
              <AppButton mode="text" onPress={closeModal} disabled={createMutation.isPending}>
                Hủy
              </AppButton>
              <AppButton loading={createMutation.isPending} onPress={handleCreate}>
                Tạo
              </AppButton>
            </Dialog.Actions>
          </KeyboardAvoidingView>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollList: { padding: spacing.lg, paddingBottom: 96, gap: spacing.md },
  headerInfo: { marginBottom: spacing.sm },
  cardList: { gap: spacing.md },
  card: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, gap: spacing.xs },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  statusText: { fontSize: 11, fontWeight: "700" },
  pressed: { opacity: 0.85 },
  fab: { position: "absolute", right: spacing.lg, bottom: spacing.xl, borderRadius: radius.pill },
});
