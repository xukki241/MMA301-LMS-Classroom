import { useEffect, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useNavigation, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/src/lib/auth-context";
import {
  fetchMyPayments,
  PAYMENT_STATUS_LABEL,
  shortUserId,
  type PaymentHistoryItem,
} from "@/src/lib/history-api";
import { formatVnd } from "@/src/lib/payment-api";
import { formatDateTime } from "@/src/lib/overview-api";
import { queryKeys } from "@/src/lib/query-client";
import { Screen } from "@/src/components/ui/Screen";
import { ClassListSkeleton } from "@/src/components/ui/Skeleton";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { ClassRequestError } from "@/src/components/ui/ClassRequestError";
import { elevation, palette, radius, spacing, typography } from "@/src/theme/tokens";

function statusTone(status: PaymentHistoryItem["status"]): string {
  if (status === "success") return palette.success;
  if (status === "failed") return palette.danger;
  return palette.warning;
}

export function PaymentHistoryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const { token, user } = useAuth();
  const isTeacher = user?.role === "teacher";
  const [pulling, setPulling] = useState(false);
  const query = useQuery({
    queryKey: queryKeys.payments(user?.id ?? ""),
    enabled: Boolean(token && user),
    queryFn: ({ signal }) => fetchMyPayments(token!, signal),
    networkMode: "always",
    retry: false,
  });

  useEffect(() => {
    navigation.setOptions({ title: "Lịch sử giao dịch" });
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
  const homeTab = isTeacher ? "/(teacher)" : "/(student)";

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={pulling} onRefresh={() => void onRefresh()} tintColor={theme.colors.primary} />
      }
    >
      <Text style={[typography.body, styles.intro, { color: theme.colors.onSurfaceVariant }]}>
        {isTeacher
          ? "Giao dịch mở khóa tài nguyên của học sinh trong lớp bạn chủ."
          : "Các lần mở khóa tài nguyên trả phí qua SePay."}
      </Text>

      {query.isPending ? <ClassListSkeleton /> : null}
      {query.isError && !query.data ? (
        <ClassRequestError error={query.error} operation="list" onRetry={() => void query.refetch({ cancelRefetch: false })} />
      ) : null}
      {!query.isPending && !query.isError && rows.length === 0 ? (
        <EmptyState
          icon="card-outline"
          title="Chưa có giao dịch"
          subtitle={
            isTeacher
              ? "Khi học sinh mở khóa tài liệu trả phí, giao dịch sẽ hiện ở đây."
              : "Khi bạn mở khóa tài liệu trả phí, giao dịch sẽ hiện ở đây."
          }
          actionLabel="Về trang chủ"
          onAction={() => router.push(homeTab as never)}
        />
      ) : null}

      {rows.map((item) => {
        const tone = statusTone(item.status);
        return (
          <Pressable
            key={item.id}
            testID={`payment-history-${item.id}`}
            accessibilityRole="button"
            accessibilityLabel={`Giao dịch ${item.materialTitle}`}
            onPress={() =>
              router.push({
                pathname: "/class/[id]/materials",
                params: { id: item.classId },
              })
            }
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
                <Text style={[styles.pillText, { color: tone }]}>{PAYMENT_STATUS_LABEL[item.status]}</Text>
              </View>
            </View>
            <Text style={typography.subtitle} numberOfLines={2}>
              {item.materialTitle}
            </Text>
            <Text style={[typography.body, { color: palette.accent }]}>{formatVnd(item.amount)}</Text>
            {isTeacher && item.studentId ? (
              <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                Học sinh · {shortUserId(item.studentId)}
              </Text>
            ) : null}
            <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
              Mã · {item.transactionRef}
            </Text>
            <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
              Cập nhật · {formatDateTime(item.updatedAt)}
            </Text>
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
