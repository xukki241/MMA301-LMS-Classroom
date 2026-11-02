import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "@/src/components/ui/Screen";
import { ClassListSkeleton } from "@/src/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/src/components/ui/EmptyState";
import { AppButton } from "@/src/components/ui/AppButton";
import { FieldError, FormDialogScroll, FormNotice, keyboardBehavior, useKeyboardLift } from "@/src/components/ui/FormFeedback";
import { CloudinaryFilePicker } from "@/src/components/ui/CloudinaryFilePicker";
import { useAuth } from "@/src/lib/auth-context";
import { userErrorMessage } from "@/src/lib/user-error-message";
import {
  canMutateExercise,
  createExercise,
  defaultDueAtIso,
  deleteExercise,
  isExerciseOpen,
  listExercises,
  updateExercise,
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
  isTeacher,
  onPress,
  onEdit,
  onDelete,
}: {
  item: LmsExercise;
  isTeacher: boolean;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const open = isExerciseOpen(item.dueAt);
  const mutable = isTeacher && canMutateExercise(item);
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
        {isTeacher ? (
          <View style={styles.cardActions}>
            {mutable ? (
              <>
                <AppButton mode="text" compact onPress={onEdit}>
                  Sửa
                </AppButton>
                <AppButton mode="text" compact textColor={theme.colors.error} onPress={onDelete}>
                  Xóa
                </AppButton>
              </>
            ) : (
              <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
                Không xoá/sửa được sau 1 giờ hoặc khi đã có bài nộp
              </Text>
            )}
          </View>
        ) : null}
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [dueAt, setDueAt] = useState(defaultDueAtIso());
  const [formError, setFormError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const keyboardLift = useKeyboardLift();

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

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: queryKeys.exercises(user!.id, classId!) });

  const createMutation = useMutation({
    mutationFn: (payload: { title: string; description: string; dueAt: string; attachmentUrl?: string }) =>
      createExercise(token!, classId!, payload),
    onSuccess: () => {
      notifySuccess();
      invalidate();
      closeModal();
    },
    onError: (err: unknown) => {
      notifyError();
      setFormError(userErrorMessage(err));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { title: string; description: string; dueAt: string; attachmentUrl?: string }) =>
      updateExercise(token!, classId!, editingId!, payload),
    onSuccess: () => {
      notifySuccess();
      invalidate();
      closeModal();
    },
    onError: (err: unknown) => {
      notifyError();
      setFormError(userErrorMessage(err));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (exerciseId: string) => deleteExercise(token!, classId!, exerciseId),
    onSuccess: () => {
      notifySuccess();
      invalidate();
    },
    onError: (err: unknown) => {
      notifyError();
      Alert.alert("Không xoá được", userErrorMessage(err));
    },
  });

  const closeModal = () => {
    setModalVisible(false);
    setEditingId(null);
    setTitle("");
    setDescription("");
    setAttachmentUrl("");
    setDueAt(defaultDueAtIso());
    setFormError(null);
    setTitleError(null);
  };

  const openCreate = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setAttachmentUrl("");
    setDueAt(defaultDueAtIso());
    setFormError(null);
    setTitleError(null);
    setModalVisible(true);
  };

  const openEdit = (item: LmsExercise) => {
    setEditingId(item.id);
    setTitle(item.title);
    setDescription(item.description);
    setAttachmentUrl(item.attachmentUrl || "");
    setDueAt(item.dueAt);
    setFormError(null);
    setTitleError(null);
    setModalVisible(true);
  };

  const confirmDelete = (item: LmsExercise) => {
    Alert.alert("Xóa bài tập?", `“${item.title}” sẽ bị xoá cứng nếu chưa có bài nộp và còn trong 1 giờ.`, [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () => deleteMutation.mutate(item.id),
      },
    ]);
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      setTitleError("Vui lòng nhập tiêu đề bài tập");
      setFormError(null);
      notifyError();
      return;
    }
    setTitleError(null);
    setFormError(null);
    const payload = {
      title: title.trim(),
      description: description.trim(),
      attachmentUrl: attachmentUrl.trim(),
      dueAt,
    };
    if (editingId) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const saving = createMutation.isPending || updateMutation.isPending;

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
                : "Giáo viên chưa giao bài tập cho lớp này. Kéo xuống để làm mới hoặc quay lại lớp."
            }
            actionLabel={isTeacher ? "Tạo bài tập" : "Quay lại lớp"}
            onAction={isTeacher ? openCreate : () => router.back()}
          />
        </Screen>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollList, { paddingBottom: 128 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
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
                  isTeacher={isTeacher}
                  onPress={() => {
                    impactLight();
                    router.push({
                      pathname: "/class/[id]/exercise/[exerciseId]",
                      params: { id: classId, exerciseId: item.id, title: item.title },
                    });
                  }}
                  onEdit={() => {
                    impactLight();
                    openEdit(item);
                  }}
                  onDelete={() => confirmDelete(item)}
                />
              </Animated.View>
            ))}
          </View>
        </ScrollView>
      )}

      {isTeacher && query.isSuccess && exercises.length > 0 ? (
        <FAB
          testID="fab-create-exercise"
          icon="plus"
          label="Tạo bài tập"
          style={[styles.fab, { bottom: spacing.lg + insets.bottom, backgroundColor: theme.colors.primary }]}
          color="#FFFFFF"
          onPress={() => {
            impactLight();
            openCreate();
          }}
        />
      ) : null}

      <Portal>
        <Dialog
          visible={modalVisible}
          onDismiss={closeModal}
          style={[styles.dialog, { marginBottom: keyboardLift, backgroundColor: theme.colors.surface }]}
        >
          <KeyboardAvoidingView behavior={keyboardBehavior}>
            <Dialog.Title>{editingId ? "Sửa bài tập" : "Tạo bài tập mới"}</Dialog.Title>
            {formError ? (
              <View style={styles.noticeInset}>
                <FormNotice message={formError} />
              </View>
            ) : null}
            <FormDialogScroll>
              <TextInput
                mode="outlined"
                label="Tiêu đề *"
                value={title}
                error={Boolean(titleError)}
                onChangeText={(value) => {
                  setTitle(value);
                  setTitleError(null);
                  setFormError(null);
                }}
              />
              <FieldError message={titleError} />
              <TextInput
                mode="outlined"
                label="Mô tả"
                multiline
                value={description}
                onChangeText={setDescription}
              />
              <CloudinaryFilePicker
                label="File đề bài (Cloudinary)"
                value={attachmentUrl}
                onChange={setAttachmentUrl}
                token={token}
                classId={classId}
                purpose="exercise"
              />
              <TextInput
                mode="outlined"
                label="Hạn nộp (ISO UTC)"
                value={dueAt}
                onChangeText={setDueAt}
                autoCapitalize="none"
              />
              <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
                Sửa/xoá chỉ trong 1 giờ sau khi tạo và khi chưa có học sinh nộp bài.
              </Text>
            </FormDialogScroll>
            <Dialog.Actions>
              <AppButton mode="text" onPress={closeModal} disabled={saving}>
                Hủy
              </AppButton>
              <AppButton loading={saving} onPress={handleSubmit}>
                {editingId ? "Lưu" : "Tạo"}
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
  scrollList: { padding: spacing.lg, gap: spacing.md },
  headerInfo: { marginBottom: spacing.sm },
  cardList: { gap: spacing.md },
  card: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, gap: spacing.xs },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardActions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.xs, marginTop: spacing.sm },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  statusText: { fontSize: 11, fontWeight: "700" },
  pressed: { opacity: 0.85 },
  fab: { position: "absolute", right: spacing.lg, borderRadius: radius.pill },
  dialog: { maxHeight: "88%", borderRadius: radius.lg },
  noticeInset: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
});
