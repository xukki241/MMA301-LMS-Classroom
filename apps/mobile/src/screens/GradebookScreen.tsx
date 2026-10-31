import { useEffect, useState } from "react";
import { RefreshControl, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { Redirect, useNavigation, useRouter } from "expo-router";
import { useOverviewQuery } from "@/src/lib/hooks";
import { useAuth } from "@/src/lib/auth-context";
import { gradebook } from "@/src/lib/overview-api";
import { Screen } from "@/src/components/ui/Screen";
import { ClassListSkeleton } from "@/src/components/ui/Skeleton";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { ClassRequestError } from "@/src/components/ui/ClassRequestError";
import { SectionHeader } from "@/src/components/ui/Tile";
import { WorkRow } from "@/src/components/schedule/Rows";
import { palette, spacing, typography } from "@/src/theme/tokens";

/** Bảng điểm của học sinh: nhóm theo lớp, có điểm trung bình từng lớp. */
export function GradebookScreen() {
  const theme = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  const query = useOverviewQuery();
  const overview = query.data;
  const books = overview ? gradebook(overview.work) : [];
  const [pulling, setPulling] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: "Bảng điểm" });
  }, [navigation]);

  const onRefresh = async () => {
    setPulling(true);
    try {
      await query.refetch({ cancelRefetch: false });
    } finally {
      setPulling(false);
    }
  };

  if (user?.role === "teacher") return <Redirect href="/(teacher)/work" />;

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={pulling} onRefresh={() => void onRefresh()} tintColor={theme.colors.primary} />
      }
    >
      {query.isPending ? <ClassListSkeleton /> : null}
      {query.isError && !overview ? <ClassRequestError error={query.error} operation="list" onRetry={() => void query.refetch({ cancelRefetch: false })} /> : null}
      {overview && books.length === 0 ? (
        <EmptyState icon="stats-chart-outline" title="Chưa có bài tập nào" subtitle="Điểm sẽ hiện ở đây khi giáo viên chấm." />
      ) : null}
      {books.map((book) => (
        <View key={book.classId}>
          <SectionHeader title={book.className} />
          <View style={[styles.avg, { backgroundColor: theme.colors.primaryContainer }]}>
            <Text style={typography.caption}>Điểm trung bình lớp</Text>
            <Text style={[typography.title, { color: book.average === null ? theme.colors.onSurfaceVariant : palette.success }]}>
              {book.average === null ? "—" : `${book.average}/10`}
            </Text>
          </View>
          {book.items.map((item) => (
            <WorkRow
              key={item.exerciseId}
              item={item}
              role="student"
              onPress={() => router.push({
                pathname: "/class/[id]/exercise/[exerciseId]",
                params: { id: item.classId, exerciseId: item.exerciseId, title: item.title },
              })}
            />
          ))}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  avg: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.lg, borderRadius: 12, marginBottom: spacing.md },
});
