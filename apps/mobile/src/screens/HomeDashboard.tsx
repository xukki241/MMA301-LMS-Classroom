import { useState } from "react";
import { StyleSheet, View, RefreshControl } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Chip, Text, useTheme } from "react-native-paper";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/lib/auth-context";
import { useOverviewQuery } from "@/src/lib/hooks";
import {
  countWork,
  gradedWork,
  presentWork,
  todaySessions,
  upcomingExams,
  type Overview,
} from "@/src/lib/overview-api";
import { ClassListSkeleton } from "@/src/components/ui/Skeleton";
import { Screen } from "@/src/components/ui/Screen";
import { ClassRequestError } from "@/src/components/ui/ClassRequestError";
import { SectionHeader, Tile, TileGrid } from "@/src/components/ui/Tile";
import { palette, spacing, typography } from "@/src/theme/tokens";

type Role = "teacher" | "student";

function summaryLine(role: Role, overview: Overview | undefined, now: Date): string {
  if (!overview) {
    return role === "teacher"
      ? "Chọn mục bên dưới để quản lý lớp, lịch và giao dịch."
      : "Chọn mục bên dưới để xem lịch, bài tập, điểm và giao dịch.";
  }
  const sessions = todaySessions(overview.sessions, now).length;
  const exams = upcomingExams(overview.exams, now, 7).length;
  const counts = countWork(presentWork(overview.work, now));
  const parts: string[] = [];
  parts.push(sessions ? `${sessions} buổi học hôm nay` : "Hôm nay không có buổi học");
  if (exams) parts.push(`${exams} kỳ kiểm tra trong 7 ngày`);
  if (role === "student" && counts.todo) parts.push(`${counts.todo} bài cần nộp`);
  if (role === "teacher" && counts.needs_grading) parts.push(`${counts.needs_grading} bài cần chấm`);
  return parts.join(" · ");
}

/**
 * Trang chủ = hub chọn phần (tile), không đổ list lịch/bài ngay.
 * Chi tiết nằm ở tab Lịch / Việc / các màn stack.
 */
export function HomeDashboard({ role }: { role: Role }) {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const query = useOverviewQuery();
  const overview = query.data;
  const [pulling, setPulling] = useState(false);
  const isTeacher = role === "teacher";
  const now = new Date();
  const prefix = isTeacher ? "/(teacher)" : "/(student)";

  const counts = overview ? countWork(presentWork(overview.work, now)) : {};
  const todayCount = overview ? todaySessions(overview.sessions, now).length : 0;
  const examCount = overview ? upcomingExams(overview.exams, now, 30).length : 0;
  const pendingCount = isTeacher ? counts.needs_grading ?? 0 : counts.todo ?? 0;
  const scores = overview ? gradedWork(overview.work).map((item) => item.score as number) : [];
  const average = scores.length
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : null;

  const onRefresh = async () => {
    setPulling(true);
    try {
      await query.refetch({ cancelRefetch: false });
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
        <Chip compact selected>
          {isTeacher ? "Giáo viên" : "Học sinh"}
        </Chip>
        <Text style={typography.display} accessibilityRole="header">
          Xin chào, {user?.displayName?.split(" ").slice(-1)[0] ?? "bạn"}
        </Text>
        <Text style={[typography.body, { color: theme.colors.onSurfaceVariant }]}>
          {summaryLine(role, overview, now)}
        </Text>
      </Animated.View>

      {query.isPending ? <ClassListSkeleton /> : null}
      {query.isError && !overview ? (
        <ClassRequestError
          error={query.error}
          operation="list"
          onRetry={() => void query.refetch({ cancelRefetch: false })}
        />
      ) : null}

      {overview ? (
        <>
          <SectionHeader title="Tổng quan của tôi" />
          <TileGrid>
            <Tile
              icon="albums-outline"
              label="Lớp học"
              hint={`${overview.classes.length} lớp`}
              delay={40}
              onPress={() => go("classes")}
            />
            <Tile
              icon="create-outline"
              label={isTeacher ? "Bài cần chấm" : "Bài cần nộp"}
              hint="Mở tab Việc"
              badge={pendingCount}
              delay={80}
              onPress={() => go("work")}
            />
            <Tile
              icon="calendar-outline"
              label="Lịch học"
              hint={`${todayCount} buổi hôm nay`}
              badge={todayCount || undefined}
              delay={120}
              onPress={() => go("schedule", { view: "study" })}
            />
            {isTeacher ? (
              <Tile
                icon="document-text-outline"
                label="Lịch kiểm tra"
                hint={`${examCount} kỳ sắp tới`}
                badge={examCount || undefined}
                tint={palette.accent}
                delay={160}
                onPress={() => go("schedule", { view: "exams" })}
              />
            ) : (
              <Tile
                icon="stats-chart-outline"
                label="Bảng điểm"
                hint={average === null ? "Chưa có điểm" : `Trung bình ${average}/10`}
                tint={palette.success}
                delay={160}
                onPress={() => router.push("/gradebook" as never)}
              />
            )}
            <Tile
              icon="card-outline"
              label="Giao dịch"
              hint={isTeacher ? "Mở khóa trong lớp" : "Mở khóa SePay"}
              delay={200}
              onPress={() => router.push("/payments" as never)}
            />
            <Tile
              icon="document-attach-outline"
              label="Nộp bài"
              hint={isTeacher ? "Bài học sinh đã nộp" : "Bài đã nộp"}
              delay={240}
              onPress={() => router.push("/submissions" as never)}
            />
          </TileGrid>

          <SectionHeader title="Lối tắt khác" />
          <TileGrid>
            {!isTeacher ? (
              <Tile
                icon="document-text-outline"
                label="Lịch kiểm tra"
                hint={`${examCount} kỳ sắp tới`}
                badge={examCount || undefined}
                tint={palette.accent}
                delay={280}
                onPress={() => go("schedule", { view: "exams" })}
              />
            ) : (
              <Tile
                icon="checkmark-done-outline"
                label="Đã chấm xong"
                hint={`${counts.done ?? 0} bài`}
                delay={280}
                onPress={() => go("work", { filter: "done" })}
              />
            )}
            <Tile
              icon="person-circle-outline"
              label="Hồ sơ"
              hint={user?.email}
              delay={320}
              onPress={() => go("profile")}
            />
          </TileGrid>
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
