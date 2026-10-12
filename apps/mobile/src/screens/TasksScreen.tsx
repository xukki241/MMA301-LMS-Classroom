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
  FAB,
  IconButton,
  Text,
  useTheme,
} from "react-native-paper";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
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
  useUpdateTaskMutation,
} from "@/src/lib/hooks";
import { impactLight, notifySuccess } from "@/src/lib/haptics";
import type { CreateTaskPayload, LmsTask, TaskPriority } from "@/src/lib/tasks-api";
import { elevation, palette, radius, spacing, typography } from "@/src/theme/tokens";

type FilterTab = "all" | "pending" | "completed" | "overdue";

function getPriorityConfig(priority: TaskPriority) {
  switch (priority) {
    case "high":
      return {
        bg: "#FEE2E2",
        text: "#DC2626",
        border: "#FECACA",
        label: "Cao",
        icon: "flame" as const,
      };
    case "medium":
      return {
        bg: "#FEF3C7",
        text: "#D97706",
        border: "#FDE68A",
        label: "Trung bình",
        icon: "flag" as const,
      };
    case "low":
    default:
      return {
        bg: "#EEF2FF",
        text: "#4F46E5",
        border: "#C7D2FE",
        label: "Thấp",
        icon: "flag-outline" as const,
      };
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

  // Fetch all tasks and filter instantaneously
  const { data: allTasks = [], isLoading, isError, error, refetch, isRefetching } = useTasksQuery();
  const createMutation = useCreateTaskMutation();
  const updateMutation = useUpdateTaskMutation();
  const toggleMutation = useToggleTaskMutation();
  const deleteMutation = useDeleteTaskMutation();

  const totalCount = allTasks.length;
  const completedCount = useMemo(
    () => allTasks.filter((t) => t.status === "completed").length,
    [allTasks]
  );
  const pendingCount = totalCount - completedCount;
  const overdueCount = useMemo(
    () =>
      allTasks.filter(
        (t) =>
          t.status !== "completed" &&
          t.dueDate &&
          new Date(t.dueDate).getTime() < Date.now()
      ).length,
    [allTasks]
  );

  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Filtered task list
  const displayTasks = useMemo(() => {
    switch (filter) {
      case "pending":
        return allTasks.filter((t) => t.status !== "completed");
      case "completed":
        return allTasks.filter((t) => t.status === "completed");
      case "overdue":
        return allTasks.filter(
          (t) =>
            t.status !== "completed" &&
            t.dueDate &&
            new Date(t.dueDate).getTime() < Date.now()
        );
      case "all":
      default:
        return allTasks;
    }
  }, [allTasks, filter]);

  const handleToggle = (task: LmsTask) => {
    impactLight();
    if (task.status !== "completed") {
      notifySuccess();
    }
    toggleMutation.mutate(task.id);
  };

  const handleEditTask = (task: LmsTask) => {
    impactLight();
    setEditingTask(task);
    setModalVisible(true);
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
    if (editingTask) {
      await updateMutation.mutateAsync({ taskId: editingTask.id, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  const filterTabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "Tất cả", count: totalCount },
    { key: "pending", label: "Chưa xong", count: pendingCount },
    { key: "completed", label: "Đã xong", count: completedCount },
    { key: "overdue", label: "Quá hạn", count: overdueCount },
  ];

  return (
    <Screen scroll={false} padded={false}>
      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ClassListSkeleton />
          </View>
        ) : isError ? (
          <View style={styles.errorContainer}>
            <ErrorState
              message={error?.message || "Đã xảy ra lỗi tải công việc"}
              onRetry={() => void refetch()}
            />
          </View>
        ) : (
          <FlatList
            data={displayTasks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={theme.colors.primary}
              />
            }
            ListHeaderComponent={
              <View style={styles.headerArea}>
                {/* Screen Header */}
                <View style={styles.headerTop}>
                  <Text style={styles.screenTitle}>Công việc cá nhân</Text>
                  <Text style={[styles.screenSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                    Quản lý việc cần làm, ghi chú và theo dõi hạn chót
                  </Text>
                </View>

                {/* Progress Hero Card */}
                <Animated.View
                  entering={FadeInDown.duration(400).springify()}
                  style={[
                    styles.heroCard,
                    elevation.card,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.outline,
                    },
                  ]}
                >
                  <View style={styles.heroTopRow}>
                    <View style={styles.heroTitleWrap}>
                      <View
                        style={[
                          styles.heroIconBubble,
                          { backgroundColor: theme.colors.primaryContainer },
                        ]}
                      >
                        <Ionicons
                          name="sparkles"
                          size={18}
                          color={theme.colors.primary}
                        />
                      </View>
                      <View>
                        <Text style={styles.heroCardTitle}>Tiến độ cá nhân</Text>
                        <Text style={[styles.heroCardSub, { color: theme.colors.onSurfaceVariant }]}>
                          {totalCount === 0
                            ? "Chưa có công việc nào"
                            : `${completedCount} / ${totalCount} việc hoàn thành`}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.percentBadge,
                        {
                          backgroundColor:
                            completionPercent === 100
                              ? "#D1FAE5"
                              : theme.colors.primaryContainer,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.percentText,
                          {
                            color:
                              completionPercent === 100
                                ? palette.success
                                : theme.colors.primary,
                          },
                        ]}
                      >
                        {completionPercent}%
                      </Text>
                    </View>
                  </View>

                  {/* Progress bar */}
                  <View
                    style={[
                      styles.progressTrack,
                      { backgroundColor: theme.colors.surfaceVariant },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${completionPercent}%`,
                          backgroundColor:
                            completionPercent === 100
                              ? palette.success
                              : theme.colors.primary,
                        },
                      ]}
                    />
                  </View>

                  {/* Stats Counter Row */}
                  <View style={styles.statsRow}>
                    <View style={styles.statCol}>
                      <Text style={styles.statNumber}>{totalCount}</Text>
                      <Text style={[styles.statTitle, { color: theme.colors.onSurfaceVariant }]}>
                        Tổng số
                      </Text>
                    </View>

                    <View style={[styles.statDivider, { backgroundColor: theme.colors.outline }]} />

                    <View style={styles.statCol}>
                      <Text style={[styles.statNumber, { color: palette.warning }]}>
                        {pendingCount}
                      </Text>
                      <Text style={[styles.statTitle, { color: theme.colors.onSurfaceVariant }]}>
                        Chưa xong
                      </Text>
                    </View>

                    <View style={[styles.statDivider, { backgroundColor: theme.colors.outline }]} />

                    <View style={styles.statCol}>
                      <Text style={[styles.statNumber, { color: palette.success }]}>
                        {completedCount}
                      </Text>
                      <Text style={[styles.statTitle, { color: theme.colors.onSurfaceVariant }]}>
                        Đã xong
                      </Text>
                    </View>

                    {overdueCount > 0 ? (
                      <>
                        <View style={[styles.statDivider, { backgroundColor: theme.colors.outline }]} />
                        <View style={styles.statCol}>
                          <Text style={[styles.statNumber, { color: palette.danger }]}>
                            {overdueCount}
                          </Text>
                          <Text style={[styles.statTitle, { color: theme.colors.onSurfaceVariant }]}>
                            Quá hạn
                          </Text>
                        </View>
                      </>
                    ) : null}
                  </View>
                </Animated.View>

                {/* Filter Pills */}
                <View style={styles.filterPillsRow}>
                  {filterTabs.map((tab) => {
                    const isActive = filter === tab.key;
                    return (
                      <Pressable
                        key={tab.key}
                        onPress={() => {
                          impactLight();
                          setFilter(tab.key);
                        }}
                        style={[
                          styles.filterPill,
                          {
                            backgroundColor: isActive
                              ? theme.colors.primary
                              : theme.colors.surface,
                            borderColor: isActive
                              ? theme.colors.primary
                              : theme.colors.outline,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterPillText,
                            {
                              color: isActive ? "#FFFFFF" : theme.colors.onSurfaceVariant,
                              fontWeight: isActive ? "700" : "500",
                            },
                          ]}
                        >
                          {tab.label}
                        </Text>
                        <View
                          style={[
                            styles.pillBadge,
                            {
                              backgroundColor: isActive
                                ? "rgba(255,255,255,0.22)"
                                : theme.colors.surfaceVariant,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.pillBadgeText,
                              {
                                color: isActive
                                  ? "#FFFFFF"
                                  : theme.colors.onSurfaceVariant,
                              },
                            ]}
                          >
                            {tab.count}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            }
            ListEmptyComponent={
              <EmptyState
                icon="checkbox-outline"
                title={
                  filter === "completed"
                    ? "Chưa có việc nào hoàn thành"
                    : filter === "overdue"
                    ? "Tuyệt vời, không có việc nào quá hạn!"
                    : filter === "pending"
                    ? "Tất cả công việc đã hoàn thành!"
                    : "Danh sách công việc trống"
                }
                subtitle="Bấm nút '+ Thêm việc' bên dưới để bắt đầu quản lý kế hoạch."
              />
            }
            renderItem={({ item, index }) => {
              const isCompleted = item.status === "completed";
              const dueInfo = formatDueDate(item.dueDate);
              const prio = getPriorityConfig(item.priority);

              return (
                <Animated.View
                  entering={FadeInDown.delay(index * 35).springify()}
                  layout={LinearTransition.springify()}
                  style={styles.cardWrap}
                >
                  <Pressable
                    onPress={() => handleEditTask(item)}
                    style={({ pressed }) => [
                      styles.card,
                      elevation.card,
                      isCompleted && styles.cardCompleted,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: isCompleted
                          ? theme.colors.outline
                          : prio.border,
                        opacity: pressed ? 0.94 : 1,
                        transform: [{ scale: pressed ? 0.985 : 1 }],
                      },
                    ]}
                  >
                    {/* Checkbox button */}
                    <Pressable
                      onPress={(e) => {
                        e?.stopPropagation?.();
                        handleToggle(item);
                      }}
                      style={styles.checkboxTouch}
                      hitSlop={8}
                    >
                      <View
                        style={[
                          styles.checkboxCircle,
                          isCompleted
                            ? styles.checkboxCircleCompleted
                            : [
                                styles.checkboxCirclePending,
                                { borderColor: theme.colors.outline },
                              ],
                        ]}
                      >
                        {isCompleted && (
                          <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                        )}
                      </View>
                    </Pressable>

                    {/* Card content */}
                    <View style={styles.cardBody}>
                      <Text
                        style={[
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
                            styles.taskDescription,
                            { color: theme.colors.onSurfaceVariant },
                          ]}
                          numberOfLines={2}
                        >
                          {item.description}
                        </Text>
                      ) : null}

                      {/* Meta Tags */}
                      <View style={styles.metaRow}>
                        {/* Priority Badge */}
                        <View
                          style={[
                            styles.badge,
                            { backgroundColor: prio.bg, borderColor: prio.border },
                          ]}
                        >
                          <Ionicons name={prio.icon} size={12} color={prio.text} />
                          <Text style={[styles.badgeText, { color: prio.text }]}>
                            {prio.label}
                          </Text>
                        </View>

                        {/* Due date Badge */}
                        {dueInfo ? (
                          <View
                            style={[
                              styles.dueBadge,
                              dueInfo.isPast && !isCompleted
                                ? styles.dueBadgeOverdue
                                : [
                                    styles.dueBadgeNormal,
                                    {
                                      backgroundColor: theme.colors.surfaceVariant,
                                      borderColor: theme.colors.outline,
                                    },
                                  ],
                            ]}
                          >
                            <Ionicons
                              name={
                                dueInfo.isPast && !isCompleted
                                  ? "alert-circle"
                                  : "calendar-outline"
                              }
                              size={12}
                              color={
                                dueInfo.isPast && !isCompleted
                                  ? palette.danger
                                  : theme.colors.onSurfaceVariant
                              }
                            />
                            <Text
                              style={[
                                styles.dueBadgeText,
                                {
                                  color:
                                    dueInfo.isPast && !isCompleted
                                      ? palette.danger
                                      : theme.colors.onSurfaceVariant,
                                  fontWeight:
                                    dueInfo.isPast && !isCompleted ? "700" : "500",
                                },
                              ]}
                            >
                              {dueInfo.isPast && !isCompleted
                                ? `Quá hạn: ${dueInfo.label}`
                                : dueInfo.label}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    {/* Action buttons */}
                    <View style={styles.cardActions}>
                      <IconButton
                        icon="pencil-outline"
                        size={18}
                        iconColor={theme.colors.onSurfaceVariant}
                        style={styles.actionBtn}
                        onPress={() => handleEditTask(item)}
                      />
                      <IconButton
                        icon="trash-can-outline"
                        size={18}
                        iconColor={palette.danger}
                        style={styles.actionBtn}
                        onPress={() => handleDelete(item)}
                      />
                    </View>
                  </Pressable>
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

        {/* Task Creation / Edit Modal */}
        <TaskModal
          visible={modalVisible}
          onDismiss={() => {
            setModalVisible(false);
            setEditingTask(null);
          }}
          initialTask={editingTask}
          onSubmit={handleSaveTask}
          isPending={editingTask ? updateMutation.isPending : createMutation.isPending}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    padding: spacing.lg,
  },
  errorContainer: {
    padding: spacing.lg,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 110,
  },
  headerArea: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTop: {
    marginBottom: spacing.md,
  },
  screenTitle: {
    ...typography.title,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  screenSubtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  heroCard: {
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  heroTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  heroIconBubble: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  heroCardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  heroCardSub: {
    fontSize: 12,
  },
  percentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  percentText: {
    fontSize: 13,
    fontWeight: "800",
  },
  progressTrack: {
    height: 8,
    borderRadius: radius.pill,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  progressBar: {
    height: "100%",
    borderRadius: radius.pill,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: spacing.xs,
  },
  statCol: {
    alignItems: "center",
    gap: 2,
  },
  statNumber: {
    fontSize: 17,
    fontWeight: "800",
  },
  statTitle: {
    fontSize: 11,
    fontWeight: "600",
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  filterPillsRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  filterPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
  },
  pillBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
  },
  pillBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  cardWrap: {
    marginBottom: spacing.sm,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  cardCompleted: {
    opacity: 0.72,
  },
  checkboxTouch: {
    marginRight: spacing.sm,
    padding: 2,
  },
  checkboxCircle: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxCirclePending: {
    borderWidth: 2,
    backgroundColor: "transparent",
  },
  checkboxCircleCompleted: {
    backgroundColor: palette.success,
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  titleCompleted: {
    textDecorationLine: "line-through",
    color: "#94A3B8",
  },
  taskDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: 4,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  dueBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  dueBadgeNormal: {},
  dueBadgeOverdue: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FECACA",
  },
  dueBadgeText: {
    fontSize: 11,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 4,
  },
  actionBtn: {
    margin: 0,
    width: 32,
    height: 32,
  },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.xxl,
    borderRadius: radius.pill,
    ...elevation.card,
  },
});
