import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import {
  Chip,
  FAB,
  IconButton,
  SegmentedButtons,
  Text,
  useTheme,
} from "react-native-paper";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { EmptyState, ErrorState } from "@/src/components/ui/EmptyState";
import { ClassListSkeleton } from "@/src/components/ui/Skeleton";
import { TaskModal } from "./TaskModal";
import {
  useCreateTaskMutation,
  useDeleteTaskMutation,
  useTasksQuery,
  useToggleTaskMutation,
} from "@/src/lib/hooks";
import { impactLight, notifySuccess } from "@/src/lib/haptics";
import type { CreateTaskPayload, LmsTask, TaskPriority } from "@/src/lib/tasks-api";
import { elevation, palette, radius, spacing, typography } from "@/src/theme/tokens";

type FilterTab = "all" | "pending" | "completed" | "overdue";

function getPriorityColor(priority: TaskPriority) {
  switch (priority) {
    case "high":
      return { bg: "#FEE2E2", text: "#DC2626", border: "#FCA5A5" };
    case "medium":
      return { bg: "#FEF3C7", text: "#D97706", border: "#FCD34D" };
    case "low":
    default:
      return { bg: "#E0E7FF", text: "#4F46E5", border: "#C7D2FE" };
  }
}

function formatDueDate(dueDateStr?: string) {
  if (!dueDateStr) return null;
  const date = new Date(dueDateStr);
  if (Number.isNaN(date.getTime())) return null;

  const now = new Date();
  const isPast = date.getTime() < now.getTime();
  const dateFormatted = date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
  const timeFormatted = date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    label: `${timeFormatted} ${dateFormatted}`,
    isPast,
  };
}

export function TasksScreen() {
  const theme = useTheme();
  const [filter, setFilter] = useState<FilterTab>("all");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<LmsTask | null>(null);

  const filterParam = useMemo(() => {
    if (filter === "pending") return { status: "pending" };
    if (filter === "completed") return { status: "completed" };
    if (filter === "overdue") return { overdue: true };
    return undefined;
  }, [filter]);

  const { data: tasks, isLoading, isError, error, refetch, isRefetching } = useTasksQuery(filterParam);
  const createMutation = useCreateTaskMutation();
  const toggleMutation = useToggleTaskMutation();
  const deleteMutation = useDeleteTaskMutation();

  const completedCount = useMemo(
    () => tasks?.filter((t) => t.status === "completed").length ?? 0,
    [tasks]
  );
  const totalCount = tasks?.length ?? 0;

  const handleToggle = (task: LmsTask) => {
    impactLight();
    if (task.status !== "completed") {
      notifySuccess();
    }
    toggleMutation.mutate(task.id);
  };

  const handleDelete = (task: LmsTask) => {
    Alert.alert("Xóa công việc", `Bạn có chắc muốn xóa công việc "${task.title}"?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () => {
          impactLight();
          deleteMutation.mutate(task.id);
        },
      },
    ]);
  };

  const handleSaveTask = async (payload: CreateTaskPayload) => {
    await createMutation.mutateAsync(payload);
  };

  return (
    <Screen>
      <View style={styles.container}>
        {/* Header Summary */}
        <View style={styles.header}>
          <View>
            <Text style={typography.title}>Công việc cá nhân</Text>
            <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
              {totalCount > 0
                ? `Đã hoàn thành ${completedCount} / ${totalCount} công việc`
                : "Quản lý việc cần làm và hạn nộp của bạn"}
            </Text>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <SegmentedButtons
            value={filter}
            onValueChange={(val) => {
              impactLight();
              setFilter(val as FilterTab);
            }}
            buttons={[
              { value: "all", label: "Tất cả" },
              { value: "pending", label: "Chưa xong" },
              { value: "completed", label: "Đã xong" },
              { value: "overdue", label: "Quá hạn" },
            ]}
          />
        </View>

        {/* Content State */}
        {isLoading ? (
          <ClassListSkeleton />
        ) : isError ? (
          <ErrorState
            message={error?.message || "Đã xảy ra lỗi"}
            onRetry={() => void refetch()}
          />
        ) : totalCount === 0 ? (
          <EmptyState
            icon="checkbox-outline"
            title={
              filter === "completed"
                ? "Chưa có công việc nào hoàn thành"
                : filter === "overdue"
                ? "Không có công việc nào quá hạn"
                : "Danh sách công việc trống"
            }
            subtitle="Bấm nút + bên dưới để thêm việc cần làm đầu tiên."
          />
        ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          renderItem={({ item, index }) => {
            const isCompleted = item.status === "completed";
            const dueInfo = formatDueDate(item.dueDate);
            const prioColors = getPriorityColor(item.priority);

            return (
              <Animated.View
                entering={FadeInDown.delay(index * 40).springify()}
                style={[
                  styles.card,
                  isCompleted && styles.cardCompleted,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <Pressable
                  onPress={() => handleToggle(item)}
                  style={styles.checkboxTouch}
                  hitSlop={8}
                >
                  <Ionicons
                    name={isCompleted ? "checkmark-circle" : "ellipse-outline"}
                    size={26}
                    color={isCompleted ? palette.success : theme.colors.outline}
                  />
                </Pressable>

                <View style={styles.cardBody}>
                  <Text
                    style={[
                      typography.body,
                      styles.taskTitle,
                      isCompleted && styles.titleCompleted,
                    ]}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>

                  {item.description ? (
                    <Text
                      style={[
                        typography.caption,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                      numberOfLines={2}
                    >
                      {item.description}
                    </Text>
                  ) : null}

                  <View style={styles.metaRow}>
                    {/* Priority badge */}
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: prioColors.bg, borderColor: prioColors.border },
                      ]}
                    >
                      <Text style={[styles.badgeText, { color: prioColors.text }]}>
                        {item.priority === "high"
                          ? "Ưu tiên Cao"
                          : item.priority === "medium"
                          ? "Trung bình"
                          : "Thấp"}
                      </Text>
                    </View>

                    {/* Due date */}
                    {dueInfo ? (
                      <View style={styles.dueRow}>
                        <Ionicons
                          name={
                            dueInfo.isPast && !isCompleted
                              ? "alert-circle"
                              : "time-outline"
                          }
                          size={14}
                          color={
                            dueInfo.isPast && !isCompleted
                              ? palette.danger
                              : theme.colors.onSurfaceVariant
                          }
                        />
                        <Text
                          style={[
                            typography.caption,
                            dueInfo.isPast && !isCompleted && styles.duePast,
                          ]}
                        >
                          {dueInfo.label}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <IconButton
                  icon="trash-can-outline"
                  size={20}
                  iconColor={theme.colors.onSurfaceVariant}
                  onPress={() => handleDelete(item)}
                />
              </Animated.View>
            );
          }}
        />
      )}

      {/* Floating Action Button */}
      <FAB
        icon="plus"
        label="Thêm việc"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={() => {
          impactLight();
          setEditingTask(null);
          setModalVisible(true);
        }}
      />

      {/* Task Creation Modal */}
      <TaskModal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        initialTask={editingTask}
        onSubmit={handleSaveTask}
        isPending={createMutation.isPending}
      />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  filterContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 90,
    gap: spacing.sm,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.md,
    ...elevation.card,
  },
  cardCompleted: {
    opacity: 0.65,
  },
  checkboxTouch: {
    marginRight: spacing.sm,
    padding: spacing.xs,
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  taskTitle: {
    fontWeight: "600",
  },
  titleCompleted: {
    textDecorationLine: "line-through",
    color: "#888",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  dueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  duePast: {
    color: palette.danger,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.xxl,
    borderRadius: radius.pill,
  },
});
