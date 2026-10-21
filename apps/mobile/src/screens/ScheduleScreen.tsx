// ScheduleScreen - calendar view of class schedule and upcoming events
import { useEffect, useMemo, useState } from "react";
import { RefreshControl, StyleSheet, View } from "react-native";
import { SegmentedButtons, Text, useTheme } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@/src/lib/auth-context";
import { useOverviewQuery } from "@/src/lib/hooks";
import {
  formatDayHeader,
  sameDay,
  startOfDay,
  upcomingExams,
  upcomingSessions,
  type OverviewExam,
  type SessionOccurrence,
} from "@/src/lib/overview-api";
import { Screen } from "@/src/components/ui/Screen";
import { AppButton } from "@/src/components/ui/AppButton";
import { ClassListSkeleton } from "@/src/components/ui/Skeleton";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { ClassRequestError } from "@/src/components/ui/ClassRequestError";
import { SectionHeader } from "@/src/components/ui/Tile";
import { MonthCalendar } from "@/src/components/schedule/MonthCalendar";
import { ExamRow, Notice, SessionRow } from "@/src/components/schedule/Rows";
import { spacing, typography } from "@/src/theme/tokens";

type DayFilter = "all" | "study" | "exams";
const SESSION_DAYS = 62;
const EXAM_DAYS = 90;

export function ScheduleScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ view?: string | string[] }>();
  const isTeacher = user?.role === "teacher";
  const rawView = Array.isArray(params.view) ? params.view[0] : params.view;
  const routeFilter: DayFilter =
    rawView === "exams" ? "exams" : rawView === "study" ? "study" : "all";
  const [filter, setFilter] = useState<DayFilter>(routeFilter);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState(() => startOfDay(new Date()));
  useEffect(() => {
    setFilter(routeFilter);
  }, [rawView, routeFilter]);
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
  const now = new Date();

  const sessions: SessionOccurrence[] = overview ? upcomingSessions(overview.sessions, now, SESSION_DAYS) : [];
  const exams: OverviewExam[] = overview ? upcomingExams(overview.exams, now, EXAM_DAYS) : [];
  const openClass = (classId: string) => router.push({ pathname: "/class/[id]/schedule", params: { id: classId } });

  const studyCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const item of sessions) {
      const ts = startOfDay(item.start).getTime();
      counts.set(ts, (counts.get(ts) ?? 0) + 1);
    }
    return counts;
  }, [sessions]);

  const examCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const exam of exams) {
      const ts = startOfDay(new Date(exam.startsAt)).getTime();
      counts.set(ts, (counts.get(ts) ?? 0) + 1);
    }
    return counts;
  }, [exams]);

  const daySessions = sessions.filter((item) => sameDay(item.start, selected));
  const dayExams = exams.filter((exam) => sameDay(new Date(exam.startsAt), selected));
  const showStudy = filter === "all" || filter === "study";
  const showExams = filter === "all" || filter === "exams";
  const dayEmpty =
    (showStudy ? daySessions.length === 0 : true) && (showExams ? dayExams.length === 0 : true);

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={pulling} onRefresh={() => void onRefresh()} tintColor={theme.colors.primary} />
      }
    >
      <Text style={typography.title} accessibilityRole="header">
        Lịch
      </Text>
      <Text style={[typography.body, styles.intro, { color: theme.colors.onSurfaceVariant }]}>
        Lịch tháng · chấm xanh = buổi học, đỏ = kiểm tra. Chọn ngày để xem chi tiết.
      </Text>
      <SegmentedButtons
        value={filter}
        onValueChange={(value) => setFilter(value as DayFilter)}
        buttons={[
          { value: "all", label: "Tất cả" },
          { value: "study", label: "Học", icon: "calendar" },
          { value: "exams", label: "Thi", icon: "file-document-outline" },
        ]}
        style={styles.segment}
      />

      {query.isPending ? <ClassListSkeleton /> : null}
      {query.isError && !overview ? (
        <ClassRequestError error={query.error} operation="list" onRetry={() => void query.refetch({ cancelRefetch: false })} />
      ) : null}

      {overview ? (
        <MonthCalendar
          month={month}
          selected={selected}
          studyCounts={showStudy ? studyCounts : undefined}
          examCounts={showExams ? examCounts : undefined}
          onSelect={setSelected}
          onChangeMonth={setMonth}
        />
      ) : null}

      {overview && dayEmpty ? (
        <EmptyState
          icon="calendar-outline"
          title={formatDayHeader(selected, now)}
          subtitle="Không có lịch khớp bộ lọc trong ngày này."
        />
      ) : null}

      {overview && showStudy && daySessions.length > 0 ? (
        <View>
          <SectionHeader title={`Học · ${formatDayHeader(selected, now)}`} />
          {daySessions.map((item) => (
            <SessionRow
              key={`${item.session.id}-${item.start.getTime()}`}
              session={item.session}
              onPress={() => openClass(item.session.classId)}
            />
          ))}
        </View>
      ) : null}

      {overview && showExams && dayExams.length > 0 ? (
        <View>
          <SectionHeader title={`Kiểm tra · ${formatDayHeader(selected, now)}`} />
          {dayExams.map((exam) => (
            <ExamRow key={exam.id} exam={exam} onPress={() => openClass(exam.classId)} />
          ))}
        </View>
      ) : null}

      {overview && isTeacher ? (
        <View style={styles.manage}>
          <SectionHeader title="Quản lý lịch theo lớp" />
          {overview.classes.length === 0 ? (
            <Notice icon="information-circle-outline" text="Tạo lớp trước để thêm lịch học và kỳ kiểm tra." />
          ) : (
            overview.classes.map((item) => (
              <AppButton key={item.id} mode="outlined" onPress={() => openClass(item.id)}>
                {`Sửa lịch · ${item.name}`}
              </AppButton>
            ))
          )}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: spacing.lg },
  segment: { marginBottom: spacing.sm },
  manage: { gap: spacing.sm, marginTop: spacing.md, paddingBottom: spacing.xl },
});
