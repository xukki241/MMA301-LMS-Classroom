import { useEffect, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useNavigation, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/src/lib/auth-context";
import {
  fetchMySubmissions,
  shortUserId,
  SUBMISSION_HISTORY_LABEL,
  type SubmissionHistoryItem,
} from "@/src/lib/history-api";
import { formatDateTime } from "@/src/lib/overview-api";
import { queryKeys } from "@/src/lib/query-client";
import { Screen } from "@/src/components/ui/Screen";
import { ClassListSkeleton } from "@/src/components/ui/Skeleton";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { ClassRequestError } from "@/src/components/ui/ClassRequestError";
import { elevation, palette, radius, spacing, typography } from "@/src/theme/tokens";

function statusTone(status: SubmissionHistoryItem["status"]): string {
  return status === "graded" ? palette.success : palette.inkMuted;
}

export function SubmissionHistoryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const { token, user } = useAuth();
  const isTeacher = user?.role === "teacher";
  const [pulling, setPulling] = useState(false);
  const query = useQuery({
    queryKey: queryKeys.submissions(user?.id ?? ""),
    enabled: Boolean(token && user),
    queryFn: ({ signal }) => fetchMySubmissions(token!, signal),
    networkMode: "always",
    retry: false,
  });

  useEffect(() => {
    navigation.setOptions({ title: "Lịch sử nộp bài" });
  }, [navigation]);

  const onRefresh = async () => {
    setPulling(true);
    try {
      await query.refetch({ cancelRefetch: false });
    } finally {
      setPulling(false);
    }
  };

  const rows = query.data ?? [];
  const workTab = isTeacher ? "/(teacher)/work" : "/(student)/work";

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={pulling} onRefresh={() => void onRefresh()} tintColor={theme.colors.primary} />
      }
    >
      <Text style={[typography.body, styles.intro, { color: theme.colors.onSurfaceVariant }]}>
        {isTeacher
          ? "Bài học sinh đã nộp trong các lớp bạn chủ, kèm điểm nếu đã chấm."
          : "Các bài bạn đã nộp, kèm điểm khi giáo viên chấm."}
      </Text>

      {query.isPending ? <ClassListSkeleton /> : null}
      {query.isError && !query.data ? (
        <ClassRequestError error={query.error} operation="list" onRetry={() => void query.refetch({ cancelRefetch: false })} />
      ) : null}
      {!query.isPending && !query.isError && rows.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title="Chưa có bài nộp"
          subtitle={
            isTeacher
              ? "Khi học sinh nộp bài, danh sách sẽ hiện ở đây."
              : "Bài đã nộp sẽ hiện ở đây theo thời gian gần nhất."
          }
          actionLabel="Xem bài tập"
          onAction={() => router.push(workTab as never)}
        />
      ) : null}

      {rows.map((item) => {
        const tone = statusTone(item.status);
        return (
          <Pressable
            key={item.id}
            testID={`submission-history-${item.id}`}
            accessibilityRole="button"
            accessibilityLabel={`Bài nộp ${item.exerciseTitle}`}
            onPress={() => {
              if (!item.classId || !item.exerciseId) return;
              router.push({
                pathname: "/class/[id]/exercise/[exerciseId]",
                params: { id: item.classId, exerciseId: item.exerciseId, title: item.exerciseTitle },
              });
            }}
            style={({ pressed }) => [
              styles.card,
              elevation.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
                opacity: pressed ? 0.92 : 1,
              },
            ]}
          >
            <View style={styles.rowTop}>
              <Text
                style={[typography.caption, styles.className, { color: theme.colors.onSurfaceVariant }]}
                numberOfLines={1}
              >
                {item.className || "Lớp"}
              </Text>
              <View style={[styles.pill, { borderColor: tone }]}>
                <Text style={[styles.pillText, { color: tone }]}>{SUBMISSION_HISTORY_LABEL[item.status]}</Text>
              </View>
            </View>
            <Text style={typography.subtitle} numberOfLines={2}>
              {item.exerciseTitle}
            </Text>
            {isTeacher && item.studentId ? (
              <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                Học sinh · {shortUserId(item.studentId)}
              </Text>
            ) : null}
            <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
              Nộp · {formatDateTime(item.submittedAt)}
            </Text>
            {item.score !== null ? (
              <Text style={[typography.subtitle, { color: palette.success }]}>Điểm · {item.score}/10</Text>
            ) : null}
            {item.feedback ? (
              <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]} numberOfLines={2}>
                Nhận xét · {item.feedback}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: spacing.lg },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 22,
  },
  className: { flex: 1, flexShrink: 1, minWidth: 0 },
  pill: {
    flexShrink: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  pillText: { fontSize: 12, fontWeight: "700" },
});
