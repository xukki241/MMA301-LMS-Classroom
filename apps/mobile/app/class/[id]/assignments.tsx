import { useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
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
import {
  Dialog,
  FAB,
  Icon,
  Portal,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ClassListSkeleton } from "@/src/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/src/components/ui/EmptyState";
import { AppButton } from "@/src/components/ui/AppButton";
import { useAuth } from "@/src/lib/auth-context";
import {
  createAssignment,
  deleteAssignment,
  listAssignments,
  type LmsAssignment,
} from "@/src/lib/assignments-api";
import { queryClient, queryKeys } from "@/src/lib/query-client";
import { impactLight, notifyError, notifySuccess } from "@/src/lib/haptics";
import { elevation, palette, radius, spacing, typography } from "@/src/theme/tokens";

/** Tính trạng thái hạn nộp */
function getDueMeta(dueDateStr?: string) {
  if (!dueDateStr) return { label: "Không có hạn nộp", color: palette.inkFaint, urgent: false };
  const due = new Date(dueDateStr);
  const now = new Date();
  const diff = due.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (diff < 0) return { label: "Đã hết hạn", color: palette.danger, urgent: false };
  if (days <= 1) return { label: "Hết hạn hôm nay!", color: palette.danger, urgent: true };
  if (days <= 3) return { label: `Còn ${days} ngày`, color: palette.warning, urgent: true };
  return {
    label: due.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }),
    color: palette.success,
    urgent: false,
  };
}

export default function AssignmentsScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { token, user } = useAuth();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const classId = Array.isArray(id) ? id[0] : id;
  const className = Array.isArray(name) ? name[0] : name;

  const isTeacher = user?.role === "teacher";

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({
      title: className ? `Bài tập · ${className}` : "Bài tập",
    });
  }, [navigation, className]);

  const query = useQuery({
    queryKey: queryKeys.assignments(classId ?? ""),
    enabled: Boolean(token && classId),
    queryFn: ({ signal }) => listAssignments(token!, classId!, signal),
  });

  const createMutation = useMutation({
    mutationFn: (data: { title: string; description?: string; dueDate?: string; maxScore?: number }) =>
      createAssignment(token!, classId!, data),
    onSuccess: () => {
      notifySuccess();
      void queryClient.invalidateQueries({ queryKey: queryKeys.assignments(classId!) });
      closeModal();
    },
    onError: (err: Error) => {
      notifyError();
      setFormError(err.message || "Không thể thêm bài tập");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (assignmentId: string) => deleteAssignment(token!, classId!, assignmentId),
    onSuccess: () => {
      notifySuccess();
      void queryClient.invalidateQueries({ queryKey: queryKeys.assignments(classId!) });
    },
    onError: (err: Error) => {
      notifyError();
      Alert.alert("Lỗi", err.message || "Không thể xóa bài tập");
    },
  });

  const closeModal = () => {
    setModalVisible(false);
    setTitle("");
    setDescription("");
    setDueDate("");
    setMaxScore("100");
    setFormError(null);
  };

  const handleDeleteConfirm = (item: LmsAssignment) => {
    impactLight();
    Alert.alert(
      "Xác nhận xóa",
      `Xóa bài tập "${item.title}"? Thao tác này không thể hoàn tác.`,
      [
        { text: "Hủy", style: "cancel" },
        { text: "Xóa", style: "destructive", onPress: () => deleteMutation.mutate(item.id) },
      ]
    );
  };

  const handleSubmit = () => {
    const trimTitle = title.trim();
    if (!trimTitle) {
      setFormError("Vui lòng nhập tiêu đề bài tập");
      notifyError();
      return;
    }

    // Validate dueDate nếu có nhập
    let parsedDue: string | undefined;
    if (dueDate.trim()) {
      const parts = dueDate.trim().split("/");
      if (parts.length === 3) {
        const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        if (isNaN(d.getTime())) {
          setFormError("Định dạng ngày không hợp lệ (dd/mm/yyyy)");
          notifyError();
          return;
        }
        parsedDue = d.toISOString();
      } else {
        setFormError("Định dạng ngày: dd/mm/yyyy");
        notifyError();
        return;
      }
    }

    const score = parseInt(maxScore, 10);
    if (isNaN(score) || score < 1 || score > 1000) {
      setFormError("Điểm tối đa phải từ 1 đến 1000");
      notifyError();
      return;
    }

    setFormError(null);
    createMutation.mutate({
      title: trimTitle,
      description: description.trim() || undefined,
      dueDate: parsedDue,
      maxScore: score,
    });
  };

  const assignments = query.data ?? [];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {query.isPending ? (
        <Screen><ClassListSkeleton /></Screen>
      ) : query.isError ? (
        <Screen>
          <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />
        </Screen>
      ) : assignments.length === 0 ? (
        <Screen
          refreshControl={
            <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
          }
        >
          <EmptyState
            icon="document-text-outline"
            title="Chưa có bài tập nào"
            subtitle={
              isTeacher
                ? "Thêm bài tập để giao cho học sinh trong lớp."
                : "Giáo viên chưa giao bài tập nào cho lớp học này."
            }
            actionLabel={isTeacher ? "Thêm bài tập" : undefined}
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
          {/* Badge count */}
          <View style={styles.headerInfo}>
            <View style={[styles.badge, { backgroundColor: theme.colors.primaryContainer }]}>
              <Ionicons name="create-outline" size={14} color={theme.colors.primary} />
              <Text style={[styles.badgeText, { color: theme.colors.primary }]}>
                {assignments.length} bài tập
              </Text>
            </View>
          </View>

          <View style={styles.cardList}>
            {assignments.map((item, index) => {
              const due = getDueMeta(item.dueDate);
              return (
                <Animated.View
                  key={item.id}
                  entering={FadeInDown.delay(index * 60).springify()}
                  style={[
                    styles.card,
                    elevation.card,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.outline,
                    },
                  ]}
                >
                  {/* Top row */}
                  <View style={styles.cardTopRow}>
                    <View style={[styles.iconCircle, { backgroundColor: `${palette.teacher}18` }]}>
                      <Ionicons name="create-outline" size={20} color={palette.teacher} />
                    </View>
                    <View style={styles.cardMeta}>
                      <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                        {item.title}
                      </Text>
                      {item.description ? (
                        <Text
                          numberOfLines={2}
                          style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}
                        >
                          {item.description}
                        </Text>
                      ) : null}
                    </View>
                    {isTeacher && (
                      <Pressable
                        onPress={() => handleDeleteConfirm(item)}
                        style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}
                        hitSlop={8}
                      >
                        <Ionicons name="trash-outline" size={17} color={palette.danger} />
                      </Pressable>
                    )}
                  </View>

                  {/* Footer: due + score */}
                  <View style={[styles.cardFooter, { borderTopColor: theme.colors.outline }]}>
                    <View style={styles.footerItem}>
                      <Ionicons name="calendar-outline" size={13} color={due.color} />
                      <Text style={[styles.footerText, { color: due.color, fontWeight: due.urgent ? "700" : "500" }]}>
                        {due.label}
                      </Text>
                    </View>
                    <View style={[styles.scorePill, { backgroundColor: `${palette.success}18` }]}>
                      <Ionicons name="star-outline" size={12} color={palette.success} />
                      <Text style={[styles.scoreText, { color: palette.success }]}>
                        {item.maxScore} điểm
                      </Text>
                    </View>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* FAB — teacher only */}
      {isTeacher && (
        <FAB
          icon="plus"
          label="Thêm bài tập"
          style={[styles.fab, { backgroundColor: palette.teacher }]}
          color="#FFFFFF"
          onPress={() => {
            impactLight();
            setModalVisible(true);
          }}
        />
      )}

      {/* Dialog */}
      <Portal>
        <Dialog
          visible={modalVisible}
          onDismiss={closeModal}
          style={[styles.dialog, { backgroundColor: theme.colors.surface }]}
        >
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.dialogHeader}>
              <View style={[styles.dialogIconBadge, { backgroundColor: `${palette.teacher}18` }]}>
                <Icon source="pencil-plus-outline" size={24} color={palette.teacher} />
              </View>
              <Text style={[typography.title, styles.dialogTitle]}>Thêm bài tập mới</Text>
              <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant, textAlign: "center" }]}>
                Giao bài tập cho học sinh trong lớp
              </Text>
            </View>

            <Dialog.Content style={styles.dialogContent}>
              {Boolean(formError) && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle-outline" size={18} color={palette.danger} />
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              )}

              <TextInput
                mode="outlined"
                label="Tiêu đề bài tập *"
                placeholder="VD: Bài tập tuần 3 - Lập trình React Native"
                value={title}
                onChangeText={(t) => { setTitle(t); if (formError) setFormError(null); }}
                outlineStyle={styles.inputOutline}
                style={styles.input}
                left={<TextInput.Icon icon="format-title" />}
              />

              <TextInput
                mode="outlined"
                label="Mô tả / Hướng dẫn (tuỳ chọn)"
                placeholder="Hướng dẫn làm bài, yêu cầu nộp..."
                multiline
                numberOfLines={2}
                value={description}
                onChangeText={setDescription}
                outlineStyle={styles.inputOutline}
                style={styles.input}
                left={<TextInput.Icon icon="text" />}
              />

              <TextInput
                mode="outlined"
                label="Hạn nộp (tuỳ chọn, dd/mm/yyyy)"
                placeholder="VD: 30/09/2026"
                keyboardType="numeric"
                value={dueDate}
                onChangeText={(t) => { setDueDate(t); if (formError) setFormError(null); }}
                outlineStyle={styles.inputOutline}
                style={styles.input}
                left={<TextInput.Icon icon="calendar-clock" />}
              />

              <TextInput
                mode="outlined"
                label="Điểm tối đa"
                keyboardType="numeric"
                value={maxScore}
                onChangeText={setMaxScore}
                outlineStyle={styles.inputOutline}
                style={styles.input}
                left={<TextInput.Icon icon="star-outline" />}
              />
            </Dialog.Content>

            <Dialog.Actions style={styles.dialogActions}>
              <AppButton mode="text" onPress={closeModal} disabled={createMutation.isPending}>
                Hủy
              </AppButton>
              <AppButton
                mode="contained"
                loading={createMutation.isPending}
                disabled={createMutation.isPending}
                onPress={handleSubmit}
              >
                Giao bài
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
  scrollList: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 90 },
  headerInfo: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    gap: 6,
  },
  badgeText: { fontSize: 12, fontWeight: "700" },
  cardList: { gap: spacing.md },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  cardMeta: { flex: 1, gap: 3 },
  cardTitle: { fontSize: 15, fontWeight: "700", lineHeight: 21 },
  deleteBtn: { padding: 6, borderRadius: 8 },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
  },
  footerItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  footerText: { fontSize: 12 },
  scorePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  scoreText: { fontSize: 12, fontWeight: "700" },
  pressed: { opacity: 0.7 },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.xl,
    borderRadius: radius.pill,
  },
  dialog: { borderRadius: 20, paddingVertical: spacing.xs },
  dialogHeader: { alignItems: "center", paddingTop: spacing.md, paddingHorizontal: spacing.lg, gap: 4 },
  dialogIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  dialogTitle: { fontSize: 18, fontWeight: "800" },
  dialogContent: { gap: spacing.sm, paddingTop: spacing.md },
  input: { backgroundColor: "transparent" },
  inputOutline: { borderRadius: 12 },
  dialogActions: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.dangerSoft,
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    gap: 6,
  },
  errorText: { flex: 1, fontSize: 12, color: palette.danger, fontWeight: "500" },
});
