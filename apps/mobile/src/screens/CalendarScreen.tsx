import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text, useTheme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Screen } from "@/src/components/ui/Screen";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { OfflineBanner } from "@/src/components/ui/OfflineBanner";
import { ClassListSkeleton } from "@/src/components/ui/Skeleton";
import { TaskModal } from "./TaskModal";
import { useAuth } from "@/src/lib/auth-context";
import {
  useCalendarQuery,
  useClassesQuery,
  useToggleTaskMutation,
  useUpdateTaskMutation,
} from "@/src/lib/hooks";
import { impactLight, notifySuccess } from "@/src/lib/haptics";
import type { CalendarEvent, CalendarEventType } from "@/src/lib/calendar-api";
import type { CreateTaskPayload, LmsTask } from "@/src/lib/tasks-api";
import { elevation, palette, radius, spacing } from "@/src/theme/tokens";

type FilterType = "all" | CalendarEventType;
type FilterStatus = "all" | "pending" | "completed" | "overdue";

function formatTime(isoDate: string): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function getDateKey(isoDate: string): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return "unknown";
  return d.toISOString().slice(0, 10);
}

function getDayHeader(dateKey: string): string {
  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  if (dateKey === todayStr) return "Hôm nay";
  if (dateKey === tomorrow) return "Ngày mai";
  if (dateKey === yesterday) return "Hôm qua";

  const d = new Date(dateKey);
  return d.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "numeric",
  });
}

export function CalendarScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();

  // State bộ lọc
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Modal task
  const [editingTask, setEditingTask] = useState<LmsTask | null>(null);
  const [taskModalVisible, setTaskModalVisible] = useState(false);

  // Queries & Mutations
  const { data, isLoading, isError, refetch, isRefetching } = useCalendarQuery();
  const classesQuery = useClassesQuery();
  const classes = classesQuery.data ?? [];

  const toggleTaskMutation = useToggleTaskMutation();
  const updateTaskMutation = useUpdateTaskMutation();

  const allEvents = data?.events ?? [];
  const summary = data?.summary ?? {
    total: allEvents.length,
    exercises: allEvents.filter((e) => e.type === "exercise").length,
    tasks: allEvents.filter((e) => e.type === "task").length,
    pending: allEvents.filter((e) => e.status === "pending" && !e.isOverdue).length,
    completed: allEvents.filter(
      (e) => e.status === "completed" || e.status === "graded" || e.status === "submitted"
    ).length,
    overdue: allEvents.filter((e) => e.isOverdue).length,
  };

  // Tính 7 ngày trong tuần được chọn
  const weekDays = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday + weekOffset * 7);

    const days: {
      dateStr: string;
      dayNum: number;
      dayLabel: string;
      isToday: boolean;
      hasEvent: boolean;
      hasOverdue: boolean;
    }[] = [];

    const todayStr = today.toISOString().slice(0, 10);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayNum = d.getDate();
      const labels = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
      const dayLabel = labels[d.getDay()];

      const dayEvents = allEvents.filter((e) => getDateKey(e.dueAt) === dateStr);
      const hasEvent = dayEvents.length > 0;
      const hasOverdue = dayEvents.some((e) => e.isOverdue);

      days.push({
        dateStr,
        dayNum,
        dayLabel,
        isToday: dateStr === todayStr,
        hasEvent,
        hasOverdue,
      });
    }

    return days;
  }, [weekOffset, allEvents]);

  // Lọc danh sách sự kiện theo các tiêu chí
  const filteredEvents = useMemo(() => {
    return allEvents.filter((event) => {
      // Lọc theo loại sự kiện
      if (typeFilter !== "all" && event.type !== typeFilter) return false;

      // Lọc theo trạng thái
      if (statusFilter === "pending") {
        const isDone =
          event.status === "completed" || event.status === "graded" || event.status === "submitted";
        if (isDone || event.isOverdue) return false;
      } else if (statusFilter === "completed") {
        const isDone =
          event.status === "completed" || event.status === "graded" || event.status === "submitted";
        if (!isDone) return false;
      } else if (statusFilter === "overdue") {
        if (!event.isOverdue) return false;
      }

      // Lọc theo lớp học
      if (selectedClassId !== "all" && event.classId !== selectedClassId) return false;

      // Lọc theo ngày được chọn trên thanh lịch tuần
      if (selectedDate && getDateKey(event.dueAt) !== selectedDate) return false;

      return true;
    });
  }, [allEvents, typeFilter, statusFilter, selectedClassId, selectedDate]);

  // Nhóm sự kiện theo ngày
  const groupedEvents = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of filteredEvents) {
      const dateKey = getDateKey(ev.dueAt);
      const list = map.get(dateKey) ?? [];
      list.push(ev);
      map.set(dateKey, list);
    }

    return Array.from(map.entries()).map(([dateKey, events]) => ({
      dateKey,
      header: getDayHeader(dateKey),
      events,
    }));
  }, [filteredEvents]);

  // Điều hướng khi bấm vào bài tập
  const handlePressExercise = (event: CalendarEvent) => {
    impactLight();
    if (!event.classId || !event.exerciseId) return;
    router.push({
      pathname: "/class/[id]/exercise/[exerciseId]",
      params: { id: event.classId, exerciseId: event.exerciseId },
    });
  };

  // Mở modal sửa task
  const handlePressTask = (event: CalendarEvent) => {
    impactLight();
    const rawTaskId = event.id.replace(/^task_/, "");
    const taskObj: LmsTask = {
      id: rawTaskId,
      userId: user?.id ?? "",
      title: event.title,
      description: event.description,
      dueDate: event.dueAt,
      priority: event.priority ?? "medium",
      status: (event.taskStatus as any) ?? "todo",
      classId: event.classId,
    };
    setEditingTask(taskObj);
    setTaskModalVisible(true);
  };

  // Toggle nhanh hoàn thành task
  const handleToggleTask = (event: CalendarEvent) => {
    impactLight();
    const rawTaskId = event.id.replace(/^task_/, "");
    toggleTaskMutation.mutate(rawTaskId, {
      onSuccess: () => {
        notifySuccess();
      },
    });
  };

  const handleSaveEditedTask = async (payload: CreateTaskPayload) => {
    if (!editingTask) return;
    await updateTaskMutation.mutateAsync({ taskId: editingTask.id, payload });
    setTaskModalVisible(false);
  };

  return (
    <Screen scroll={false} padded={false}>
      <OfflineBanner />

      <View style={styles.container}>
        {/* Header */}
        <View
          style={[
            styles.header,
            { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outline },
          ]}
        >
          <View style={styles.headerLeft}>
            <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
              Lịch & Hạn chót
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              {summary.total} sự kiện bài tập & việc cần làm
            </Text>
          </View>

          <Pressable
            onPress={() => {
              impactLight();
              setSelectedDate(new Date().toISOString().slice(0, 10));
              setWeekOffset(0);
            }}
            style={[styles.todayButton, { backgroundColor: theme.colors.primaryContainer }]}
          >
            <Ionicons name="today-outline" size={16} color={theme.colors.primary} />
            <Text style={[styles.todayButtonText, { color: theme.colors.primary }]}>Hôm nay</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ClassListSkeleton />
          </View>
        ) : isError ? (
          <View style={styles.emptyContainer}>
            <EmptyState
              icon="calendar-outline"
              title="Không thể tải lịch trình"
              subtitle="Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau."
              actionLabel="Thử lại"
              onAction={() => void refetch()}
            />
          </View>
        ) : (
          <FlatList
            data={groupedEvents}
            keyExtractor={(item) => item.dateKey}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={() => void refetch()}
                colors={[theme.colors.primary]}
              />
            }
            ListHeaderComponent={
              <View>
                {/* Thanh Lịch Tuần (Week Strip) */}
                <View
                  style={[
                    styles.weekStripCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.outline,
                    },
                  ]}
                >
                  <View style={styles.weekStripHeader}>
                    <Pressable
                      onPress={() => {
                        impactLight();
                        setWeekOffset((prev) => prev - 1);
                      }}
                      style={styles.navArrowTouch}
                    >
                      <Ionicons name="chevron-back" size={20} color={theme.colors.onSurface} />
                    </Pressable>

                    <Text style={[styles.weekLabel, { color: theme.colors.onSurface }]}>
                      {weekOffset === 0
                        ? "Tuần này"
                        : weekOffset === 1
                        ? "Tuần tới"
                        : weekOffset === -1
                        ? "Tuần trước"
                        : `Tuần (${weekOffset > 0 ? "+" : ""}${weekOffset})`}
                    </Text>

                    <Pressable
                      onPress={() => {
                        impactLight();
                        setWeekOffset((prev) => prev + 1);
                      }}
                      style={styles.navArrowTouch}
                    >
                      <Ionicons name="chevron-forward" size={20} color={theme.colors.onSurface} />
                    </Pressable>
                  </View>

                  <View style={styles.weekDaysRow}>
                    {weekDays.map((d) => {
                      const isSelected = selectedDate === d.dateStr;
                      return (
                        <Pressable
                          key={d.dateStr}
                          onPress={() => {
                            impactLight();
                            setSelectedDate(isSelected ? null : d.dateStr);
                          }}
                          style={[
                            styles.dayCell,
                            isSelected && {
                              backgroundColor: theme.colors.primary,
                              borderColor: theme.colors.primary,
                            },
                            !isSelected &&
                              d.isToday && {
                                borderColor: theme.colors.primary,
                                borderWidth: 1.5,
                              },
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayLabelText,
                              {
                                color: isSelected
                                  ? "#FFFFFF"
                                  : d.isToday
                                  ? theme.colors.primary
                                  : theme.colors.onSurfaceVariant,
                              },
                            ]}
                          >
                            {d.dayLabel}
                          </Text>
                          <Text
                            style={[
                              styles.dayNumText,
                              {
                                color: isSelected
                                  ? "#FFFFFF"
                                  : d.isToday
                                  ? theme.colors.primary
                                  : theme.colors.onSurface,
                              },
                            ]}
                          >
                            {d.dayNum}
                          </Text>

                          {/* Dot indicator */}
                          {d.hasEvent ? (
                            <View
                              style={[
                                styles.dotIndicator,
                                {
                                  backgroundColor: isSelected
                                    ? "#FFFFFF"
                                    : d.hasOverdue
                                    ? palette.danger
                                    : theme.colors.primary,
                                },
                              ]}
                            />
                          ) : (
                            <View style={styles.dotPlaceholder} />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>

                  {selectedDate ? (
                    <Pressable
                      onPress={() => {
                        impactLight();
                        setSelectedDate(null);
                      }}
                      style={styles.clearDateFilterBtn}
                    >
                      <Text style={[styles.clearDateFilterText, { color: theme.colors.primary }]}>
                        Hiện tất cả các ngày trong tháng
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                {/* Metric Summary Cards */}
                <View style={styles.statsRow}>
                  <View
                    style={[
                      styles.statCard,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.outline,
                      },
                    ]}
                  >
                    <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                      {summary.total}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                      Tổng số
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statCard,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.outline,
                      },
                    ]}
                  >
                    <Text style={[styles.statValue, { color: "#6366F1" }]}>
                      {summary.exercises}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                      Bài tập lớp
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statCard,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.outline,
                      },
                    ]}
                  >
                    <Text style={[styles.statValue, { color: "#0EA5E9" }]}>
                      {summary.tasks}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                      Việc cá nhân
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statCard,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.outline,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statValue,
                        { color: summary.overdue > 0 ? palette.danger : palette.success },
                      ]}
                    >
                      {summary.overdue}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                      Quá hạn
                    </Text>
                  </View>
                </View>

                {/* Filter Controls */}
                <View style={styles.filterSection}>
                  {/* Filter Row 1: Loại sự kiện */}
                  <View style={styles.filterPillsRow}>
                    {(
                      [
                        { key: "all", label: "Tất cả" },
                        { key: "exercise", label: "Bài tập lớp" },
                        { key: "task", label: "Việc cá nhân" },
                      ] as const
                    ).map((f) => {
                      const isActive = typeFilter === f.key;
                      return (
                        <Pressable
                          key={f.key}
                          onPress={() => {
                            impactLight();
                            setTypeFilter(f.key);
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
                                color: isActive ? "#FFFFFF" : theme.colors.onSurface,
                                fontWeight: isActive ? "700" : "500",
                              },
                            ]}
                          >
                            {f.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Filter Row 2: Trạng thái */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.statusChipsScroll}
                  >
                    {(
                      [
                        { key: "all", label: "Tất cả trạng thái" },
                        { key: "pending", label: "Chưa xong / Cần nộp" },
                        { key: "completed", label: "Đã hoàn thành" },
                        { key: "overdue", label: "Quá hạn" },
                      ] as const
                    ).map((s) => {
                      const isActive = statusFilter === s.key;
                      return (
                        <Pressable
                          key={s.key}
                          onPress={() => {
                            impactLight();
                            setStatusFilter(s.key);
                          }}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: isActive
                                ? theme.colors.primaryContainer
                                : theme.colors.surface,
                              borderColor: isActive
                                ? theme.colors.primary
                                : theme.colors.outline,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              {
                                color: isActive
                                  ? theme.colors.primary
                                  : theme.colors.onSurfaceVariant,
                                fontWeight: isActive ? "700" : "500",
                              },
                            ]}
                          >
                            {s.label}
                          </Text>
                        </Pressable>
                      );
                    })}

                    {/* Filter lớp học (nếu có lớp) */}
                    {classes.length > 0 ? (
                      classes.map((c) => {
                        const isSelected = selectedClassId === c.id;
                        return (
                          <Pressable
                            key={c.id}
                            onPress={() => {
                              impactLight();
                              setSelectedClassId(isSelected ? "all" : c.id);
                            }}
                            style={[
                              styles.chip,
                              {
                                backgroundColor: isSelected
                                  ? theme.colors.primaryContainer
                                  : theme.colors.surface,
                                borderColor: isSelected
                                  ? theme.colors.primary
                                  : theme.colors.outline,
                              },
                            ]}
                          >
                            <Ionicons
                              name="school-outline"
                              size={13}
                              color={
                                isSelected ? theme.colors.primary : theme.colors.onSurfaceVariant
                              }
                            />
                            <Text
                              style={[
                                styles.chipText,
                                {
                                  color: isSelected
                                    ? theme.colors.primary
                                    : theme.colors.onSurfaceVariant,
                                  fontWeight: isSelected ? "700" : "500",
                                },
                              ]}
                            >
                              {c.name}
                            </Text>
                          </Pressable>
                        );
                      })
                    ) : null}
                  </ScrollView>
                </View>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.groupSection}>
                <View style={styles.groupHeaderRow}>
                  <View style={[styles.groupDot, { backgroundColor: theme.colors.primary }]} />
                  <Text style={[styles.groupHeaderText, { color: theme.colors.onSurface }]}>
                    {item.header}
                  </Text>
                  <Text style={[styles.groupCountText, { color: theme.colors.onSurfaceVariant }]}>
                    ({item.events.length})
                  </Text>
                </View>

                {item.events.map((event) => {
                  const isExercise = event.type === "exercise";
                  const isDone =
                    event.status === "completed" ||
                    event.status === "graded" ||
                    event.status === "submitted";

                  return (
                    <Pressable
                      key={event.id}
                      onPress={() => {
                        if (isExercise) {
                          handlePressExercise(event);
                        } else {
                          handlePressTask(event);
                        }
                      }}
                      style={[
                        styles.eventCard,
                        {
                          backgroundColor: theme.colors.surface,
                          borderColor: event.isOverdue
                            ? palette.danger
                            : isDone
                            ? theme.colors.outline
                            : theme.colors.outline,
                        },
                        isDone && styles.cardDone,
                      ]}
                    >
                      {/* Left accent bar */}
                      <View
                        style={[
                          styles.accentBar,
                          {
                            backgroundColor: event.isOverdue
                              ? palette.danger
                              : isDone
                              ? palette.success
                              : isExercise
                              ? "#6366F1"
                              : "#0EA5E9",
                          },
                        ]}
                      />

                      {/* Icon or Checkbox */}
                      <View style={styles.iconCol}>
                        {isExercise ? (
                          <View
                            style={[
                              styles.typeIconBadge,
                              {
                                backgroundColor: isDone
                                  ? "#D1FAE5"
                                  : event.isOverdue
                                  ? "#FEE2E2"
                                  : "#EEF2FF",
                              },
                            ]}
                          >
                            <Ionicons
                              name={isDone ? "checkmark-circle" : "book-outline"}
                              size={18}
                              color={
                                isDone
                                  ? palette.success
                                  : event.isOverdue
                                  ? palette.danger
                                  : "#6366F1"
                              }
                            />
                          </View>
                        ) : (
                          <Pressable
                            onPress={() => handleToggleTask(event)}
                            style={styles.taskCheckTouch}
                          >
                            <View
                              style={[
                                styles.checkboxCircle,
                                isDone
                                  ? styles.checkboxCircleCompleted
                                  : [
                                      styles.checkboxCirclePending,
                                      { borderColor: theme.colors.outline },
                                    ],
                              ]}
                            >
                              {isDone ? (
                                <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                              ) : null}
                            </View>
                          </Pressable>
                        )}
                      </View>

                      {/* Card Content */}
                      <View style={styles.cardBody}>
                        {/* Meta Tags Row */}
                        <View style={styles.cardMetaRow}>
                          <View
                            style={[
                              styles.metaBadge,
                              {
                                backgroundColor: isExercise ? "#EEF2FF" : "#E0F2FE",
                                borderColor: isExercise ? "#C7D2FE" : "#BAE6FD",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.metaBadgeText,
                                { color: isExercise ? "#4F46E5" : "#0284C7" },
                              ]}
                            >
                              {isExercise ? "Bài tập" : "Việc cá nhân"}
                            </Text>
                          </View>

                          {event.className ? (
                            <View
                              style={[
                                styles.metaBadge,
                                {
                                  backgroundColor: theme.colors.surfaceVariant,
                                  borderColor: theme.colors.outline,
                                },
                              ]}
                            >
                              <Ionicons
                                name="school-outline"
                                size={10}
                                color={theme.colors.onSurfaceVariant}
                              />
                              <Text
                                style={[
                                  styles.metaBadgeText,
                                  { color: theme.colors.onSurfaceVariant },
                                ]}
                                numberOfLines={1}
                              >
                                {event.className}
                              </Text>
                            </View>
                          ) : null}

                          {/* Grade or Status Badge */}
                          {typeof event.grade === "number" ? (
                            <View style={[styles.metaBadge, styles.gradeBadge]}>
                              <Ionicons name="star" size={10} color="#D97706" />
                              <Text style={styles.gradeBadgeText}>{event.grade} điểm</Text>
                            </View>
                          ) : event.status === "submitted" ? (
                            <View style={[styles.metaBadge, styles.submittedBadge]}>
                              <Text style={styles.submittedBadgeText}>Đã nộp</Text>
                            </View>
                          ) : event.isOverdue ? (
                            <View style={[styles.metaBadge, styles.overdueBadge]}>
                              <Text style={styles.overdueBadgeText}>Quá hạn</Text>
                            </View>
                          ) : null}
                        </View>

                        {/* Title */}
                        <Text
                          style={[
                            styles.eventTitle,
                            { color: theme.colors.onSurface },
                            isDone && styles.titleDone,
                          ]}
                          numberOfLines={2}
                        >
                          {event.title}
                        </Text>

                        {/* Description (nếu có) */}
                        {event.description ? (
                          <Text
                            style={[
                              styles.eventDescription,
                              { color: theme.colors.onSurfaceVariant },
                            ]}
                            numberOfLines={1}
                          >
                            {event.description}
                          </Text>
                        ) : null}

                        {/* Due Time Row */}
                        <View style={styles.dueTimeRow}>
                          <Ionicons
                            name="time-outline"
                            size={12}
                            color={event.isOverdue ? palette.danger : theme.colors.onSurfaceVariant}
                          />
                          <Text
                            style={[
                              styles.dueTimeText,
                              {
                                color: event.isOverdue
                                  ? palette.danger
                                  : theme.colors.onSurfaceVariant,
                              },
                            ]}
                          >
                            Hạn: {formatTime(event.dueAt)} {formatDate(event.dueAt)}
                          </Text>
                        </View>
                      </View>

                      {/* Right Action */}
                      <View style={styles.rightActionCol}>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={theme.colors.onSurfaceVariant}
                        />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <EmptyState
                  icon="calendar-outline"
                  title="Không có deadline nào"
                  subtitle="Bạn không có bài tập hay công việc nào cần nộp trong khoảng thời gian này."
                />
              </View>
            }
          />
        )}

        {/* Task Modal chỉnh sửa nhanh */}
        <TaskModal
          visible={taskModalVisible}
          onDismiss={() => setTaskModalVisible(false)}
          initialTask={editingTask}
          onSubmit={handleSaveEditedTask}
          isPending={updateTaskMutation.isPending}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  todayButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  todayButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl * 2,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  weekStripCard: {
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    ...elevation.card,
  },
  weekStripHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  navArrowTouch: {
    padding: 6,
  },
  weekLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  weekDaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 4,
  },
  dayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "transparent",
  },
  dayLabelText: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
  },
  dayNumText: {
    fontSize: 15,
    fontWeight: "800",
  },
  dotIndicator: {
    width: 5,
    height: 5,
    borderRadius: radius.pill,
    marginTop: 4,
  },
  dotPlaceholder: {
    width: 5,
    height: 5,
    marginTop: 4,
  },
  clearDateFilterBtn: {
    alignItems: "center",
    paddingTop: spacing.sm,
  },
  clearDateFilterText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: "center",
    ...elevation.card,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
    textAlign: "center",
  },
  filterSection: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterPillsRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  filterPill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
  },
  statusChipsScroll: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
  },
  groupSection: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  groupHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  groupDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
  },
  groupHeaderText: {
    fontSize: 14,
    fontWeight: "700",
  },
  groupCountText: {
    fontSize: 12,
  },
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: "hidden",
    padding: spacing.md,
    ...elevation.card,
  },
  cardDone: {
    opacity: 0.72,
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  iconCol: {
    marginRight: spacing.sm,
    marginLeft: 2,
  },
  typeIconBadge: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  taskCheckTouch: {
    padding: 2,
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
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
    gap: 3,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 5,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  metaBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  gradeBadge: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
  },
  gradeBadgeText: {
    color: "#B45309",
    fontSize: 10,
    fontWeight: "700",
  },
  submittedBadge: {
    backgroundColor: "#E0E7FF",
    borderColor: "#C7D2FE",
  },
  submittedBadgeText: {
    color: "#4338CA",
    fontSize: 10,
    fontWeight: "700",
  },
  overdueBadge: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FECACA",
  },
  overdueBadgeText: {
    color: "#DC2626",
    fontSize: 10,
    fontWeight: "700",
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  titleDone: {
    textDecorationLine: "line-through",
    color: "#94A3B8",
  },
  eventDescription: {
    fontSize: 12,
  },
  dueTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  dueTimeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  rightActionCol: {
    marginLeft: spacing.xs,
  },
  loadingContainer: {
    padding: spacing.lg,
  },
  emptyContainer: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
});
