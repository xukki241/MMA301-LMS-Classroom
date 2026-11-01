import { useState } from "react";
import { StyleSheet, View, RefreshControl } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Chip, Text, useTheme } from "react-native-paper";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/lib/auth-context";
import { useClassesQuery, useOverviewQuery } from "@/src/lib/hooks";
import {
  countWork,
  dueSoon,
  filterWork,
  formatDayHeader,
  gradedWork,
  todaySessions,
  upcomingExams,
  type Overview,
  type OverviewWork,
} from "@/src/lib/overview-api";
import { ClassListSkeleton } from "@/src/components/ui/Skeleton";
import { Screen } from "@/src/components/ui/Screen";
import { ClassCard } from "@/src/components/ui/ClassCard";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { ClassRequestError } from "@/src/components/ui/ClassRequestError";
import { SectionHeader, Tile, TileGrid } from "@/src/components/ui/Tile";
import { ExamRow, Notice, SessionRow, WorkRow } from "@/src/components/schedule/Rows";
import { palette, spacing, typography } from "@/src/theme/tokens";

type Role = "teacher" | "student";

function workHref(item: OverviewWork) {
  return {
    pathname: "/class/[id]/exercise/[exerciseId]" as const,
    params: { id: item.classId, exerciseId: item.exerciseId, title: item.title },
  };
}

function summaryLine(role: Role, overview: Overview | undefined, now: Date): string {
  if (!overview) return role === "teacher" ? "Quản lý lớp, lịch dạy và chấm bài ở một nơi." : "Lịch học, bài tập và điểm của bạn ở một nơi.";
  const sessions = todaySessions(overview.sessions, now).length;
  const exams = upcomingExams(overview.exams, now, 7).length;
  const counts = countWork(overview.work);
  const parts: string[] = [];
  parts.push(sessions ? `${sessions} buổi học hôm nay` : "Hôm nay không có buổi học");
  if (exams) parts.push(`${exams} kỳ kiểm tra trong 7 ngày tới`);
  if (role === "student" && counts.todo) parts.push(`${counts.todo} bài cần nộp`);
  if (role === "teacher" && counts.needs_grading) parts.push(`${counts.needs_grading} bài cần chấm`);
  return parts.join(" · ");
}

export function HomeDashboard({ role }: { role: Role }) {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const query = useOverviewQuery();
  const classesQuery = useClassesQuery();
  const overview = query.data;
  const [pulling, setPulling] = useState(false);
  const isTeacher = role === "teacher";
  const now = new Date();
  const prefix = isTeacher ? "/(teacher)" : "/(student)";

  const counts = overview ? countWork(overview.work) : {};
  const today = overview ? todaySessions(overview.sessions, now) : [];
  const exams = overview ? upcomingExams(overview.exams, now, 30) : [];
  const attention = overview
    ? (isTeacher ? filterWork(overview.work, "needs_grading") : dueSoon(overview.work, now, 14)).slice(0, 3)
    : [];
  const recentGrades = overview ? gradedWork(overview.work).slice(-2).reverse() : [];
  const recentClasses = overview
    ? overview.classes.map((item) => ({ ...item, teacherId: "", createdAt: "", updatedAt: "" }))
    : (classesQuery.data ?? []);
  const pendingCount = isTeacher ? counts.needs_grading ?? 0 : counts.todo ?? 0;
  const onRefresh = async () => {
    setPulling(true);
    try {
      await Promise.all([
        query.refetch({ cancelRefetch: false }),
        classesQuery.refetch({ cancelRefetch: false }),
      ]);
    } finally {
      setPulling(false);
    }
  };

  const go = (name: string, params?: Record<string, string>) =>
    router.push({ pathname: `${prefix}/${name}` as never, params } as never);

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={pulling} onRefresh={() => void onRefresh()} tintColor={theme.colors.primary} />
      }
    >
      <Animated.View entering={FadeInDown.springify()} style={styles.hero}>
        <Chip compact selected>{isTeacher ? "Giáo viên" : "Học sinh"}</Chip>
        <Text style={typography.display}>Xin chào, {user?.displayName?.split(" ").slice(-1)[0] ?? "bạn"}</Text>
        <Text style={[typography.body, { color: theme.colors.onSurfaceVariant }]}>{summaryLine(role, overview, now)}</Text>
      </Animated.View>

      {query.isPending ? <ClassListSkeleton /> : null}
      {query.isError && !overview ? (
        <ClassRequestError error={query.error} operation="list" onRetry={() => void query.refetch({ cancelRefetch: false })} />
      ) : null}

      {overview ? (
        <>
          {today.length > 0 ? (
            <>
              <SectionHeader title={`Buổi học ${formatDayHeader(now, now).toLowerCase()}`} />
              {today.map(({ session }) => (
                <SessionRow key={session.id} session={session} onPress={() => router.push({ pathname: "/class/[id]", params: { id: session.classId } })} />
              ))}
            </>
          ) : null}

          {exams[0] ? (
            <>
              <SectionHeader title="Kiểm tra sắp tới" />
              <ExamRow exam={exams[0]} onPress={() => go("schedule", { view: "exams" })} />
            </>
          ) : null}

          <SectionHeader title={isTeacher ? "Cần chấm" : "Việc cần làm"} />
          {attention.length === 0 ? (
            <Notice
              icon="checkmark-circle-outline"
              text={isTeacher ? "Không có bài nào đang chờ chấm." : "Bạn không có bài nào sắp đến hạn. Tuyệt vời!"}
            />
          ) : (
            attention.map((item) => (
              <WorkRow key={item.exerciseId} item={item} role={role} onPress={() => router.push(workHref(item))} />
            ))
          )}

          <SectionHeader title="Truy cập thông tin" />
          <TileGrid>
            <Tile icon="calendar-outline" label="Lịch học" hint={`${today.length} buổi hôm nay`} badge={today.length} delay={60} onPress={() => go("schedule", { view: "study" })} />
            <Tile icon="document-text-outline" label="Lịch kiểm tra" hint={`${exams.length} kỳ sắp tới`} badge={exams.length} tint={palette.accent} delay={100} onPress={() => go("schedule", { view: "exams" })} />
            <Tile icon="create-outline" label={isTeacher ? "Chấm bài" : "Bài tập"} hint={isTeacher ? `${counts.needs_grading ?? 0} chờ chấm` : `${counts.todo ?? 0} cần nộp`} badge={pendingCount} delay={140} onPress={() => go("work")} />
            <Tile icon="albums-outline" label="Lớp học" hint={`${overview.classes.length} lớp`} delay={180} onPress={() => go("classes")} />
          </TileGrid>

          <SectionHeader title="Báo cáo" />
          <TileGrid>
            {isTeacher ? (
              <Tile icon="checkmark-done-outline" label="Đã chấm xong" hint={`${counts.done ?? 0} bài`} delay={220} onPress={() => go("work", { filter: "done" })} />
            ) : (
              <Tile icon="stats-chart-outline" label="Bảng điểm" hint={`${counts.graded ?? 0} bài có điểm`} tint={palette.success} delay={220} onPress={() => router.push("/gradebook" as never)} />
            )}
            <Tile icon="person-circle-outline" label="Hồ sơ" hint={user?.email} delay={260} onPress={() => go("profile")} />
          </TileGrid>

          {!isTeacher && recentGrades.length > 0 ? (
            <>
              <SectionHeader title="Điểm mới" />
              {recentGrades.map((item) => (
                <WorkRow key={item.exerciseId} item={item} role={role} onPress={() => router.push(workHref(item))} />
              ))}
            </>
          ) : null}

        </>
      ) : null}

      {overview || query.isError ? (
        <>
          <SectionHeader title="Lớp gần đây" />
          {!overview && classesQuery.isPending ? <ClassListSkeleton /> : recentClasses.length === 0 ? (
            <EmptyState
              icon="school-outline"
              title="Chưa có lớp nào"
              subtitle={isTeacher ? "Tạo lớp đầu tiên từ tab Lớp." : "Nhập mã lớp ở tab Lớp để tham gia."}
              actionLabel="Mở tab Lớp"
              onAction={() => go("classes")}
            />
          ) : (
            recentClasses.slice(0, 3).map((item, index) => (
              <ClassCard
                key={item.id}
                item={item}
                index={index}
                onPress={() => router.push({ pathname: "/class/[id]", params: { id: item.id } })}
              />
            ))
          )}
        </>
      ) : null}
      <View style={styles.tail} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.sm, paddingTop: spacing.md, paddingBottom: spacing.sm },
  tail: { height: spacing.xl },
});
