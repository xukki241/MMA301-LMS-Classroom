import { useEffect, useState } from "react";
import { RefreshControl, StyleSheet, View } from "react-native";
import { Chip, Text, useTheme } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@/src/lib/auth-context";
import { useOverviewQuery } from "@/src/lib/hooks";
import {
  countWork,
  filterWork,
  presentWork,
  STUDENT_STATUS_LABEL,
  TEACHER_STATUS_LABEL,
  type WorkFilter,
} from "@/src/lib/overview-api";
import { Screen } from "@/src/components/ui/Screen";
import { ClassListSkeleton } from "@/src/components/ui/Skeleton";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { ClassRequestError } from "@/src/components/ui/ClassRequestError";
import { WorkRow } from "@/src/components/schedule/Rows";
import { spacing, typography } from "@/src/theme/tokens";

const STUDENT_FILTERS: WorkFilter[] = ["all", "todo", "submitted", "graded", "overdue"];
const TEACHER_FILTERS: WorkFilter[] = ["all", "needs_grading", "open", "done", "closed"];

function filterLabel(filter: WorkFilter): string {
  if (filter === "all") return "Tất cả";
  return (
    STUDENT_STATUS_LABEL[filter as keyof typeof STUDENT_STATUS_LABEL] ??
    TEACHER_STATUS_LABEL[filter as keyof typeof TEACHER_STATUS_LABEL] ??
    filter
  );
}

const EMPTY_TEXT: Record<string, string> = {
  all: "Chưa có bài tập nào trong các lớp của bạn.",
  todo: "Không còn bài nào cần nộp.",
  submitted: "Chưa có bài nào đang chờ chấm.",
  graded: "Chưa có bài nào được chấm điểm.",
  overdue: "Không có bài quá hạn.",
  needs_grading: "Không có bài nào chờ chấm.",
  open: "Không có bài nào đang mở.",
  done: "Chưa có bài nào chấm xong.",
  closed: "Không có bài nào đã hết hạn mà chưa có nộp.",
};

export function WorkScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ filter?: string | string[] }>();
  const isTeacher = user?.role === "teacher";
  const role = isTeacher ? "teacher" : "student";
  const filters = isTeacher ? TEACHER_FILTERS : STUDENT_FILTERS;
  const rawFilter = Array.isArray(params.filter) ? params.filter[0] : params.filter;
  const routeFilter: WorkFilter = filters.includes(rawFilter as WorkFilter)
    ? (rawFilter as WorkFilter)
    : "all";
  const [filter, setFilter] = useState<WorkFilter>(routeFilter);
  useEffect(() => {
    setFilter(routeFilter);
  }, [rawFilter, routeFilter]);
  const query = useOverviewQuery();
  const overview = query.data;
  const [pulling, setPulling] = useState(false);
  const onRefresh = async () => {
    setPulling(true);
    try {
      await query.refetch({ cancelRefetch: false });
    } finally {
      setPulling(false);
    }
  };
  const liveWork = overview ? presentWork(overview.work) : [];
  const counts = overview ? countWork(liveWork) : {};
  const rows = overview ? filterWork(liveWork, filter) : [];

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={pulling} onRefresh={() => void onRefresh()} tintColor={theme.colors.primary} />
      }
    >
      <Text style={typography.title} accessibilityRole="header">{isTeacher ? "Chấm bài" : "Bài tập"}</Text>
      <Text style={[typography.body, styles.intro, { color: theme.colors.onSurfaceVariant }]}>
        {isTeacher ? "Bài tập của mọi lớp, ưu tiên những bài đã hết hạn và còn bài chưa chấm." : "Bài tập của mọi lớp kèm trạng thái và điểm."}
      </Text>

      <View style={styles.chips}>
        {filters.map((item) => (
          <Chip
            key={item}
            mode={filter === item ? "flat" : "outlined"}
            selected={filter === item}
            showSelectedCheck={false}
            style={filter === item ? { backgroundColor: theme.colors.primary } : undefined}
            textStyle={filter === item ? { color: theme.colors.onPrimary, fontWeight: "700" } : undefined}
            onPress={() => setFilter(item)}
            accessibilityLabel={`Lọc ${filterLabel(item)}`}
          >
            {`${filterLabel(item)} (${counts[item] ?? 0})`}
          </Chip>
        ))}
      </View>

      {query.isPending ? <ClassListSkeleton /> : null}
      {query.isError && !overview ? <ClassRequestError error={query.error} operation="list" onRetry={() => void query.refetch({ cancelRefetch: false })} /> : null}
      {overview && rows.length === 0 ? <EmptyState icon="checkmark-done-outline" title={EMPTY_TEXT[filter] ?? "Không có mục nào."} /> : null}
      {rows.map((item) => (
        <WorkRow
          key={item.exerciseId}
          item={item}
          role={role}
          onPress={() => router.push({
            pathname: "/class/[id]/exercise/[exerciseId]",
            params: { id: item.classId, exerciseId: item.exerciseId, title: item.title },
          })}
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: spacing.lg },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingBottom: spacing.lg },
});
