import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Divider, Text, useTheme } from "react-native-paper";
import { Screen } from "@/src/components/ui/Screen";
import { AppButton } from "@/src/components/ui/AppButton";
import { CachedAvatar } from "@/src/components/ui/CachedAvatar";
import { useAuth } from "@/src/lib/auth-context";
import { useRouter } from "expo-router";
import { useMeQuery, useOverviewQuery } from "@/src/lib/hooks";
import { countWork, gradedWork } from "@/src/lib/overview-api";
import { SectionHeader, Tile, TileGrid } from "@/src/components/ui/Tile";
import { ClassRequestError } from "@/src/components/ui/ClassRequestError";
import { AUTH_URL, CORE_URL } from "@/src/lib/config";
import { notifySuccess } from "@/src/lib/haptics";
import { spacing, typography } from "@/src/theme/tokens";

export function ProfileScreen() {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const meQuery = useMeQuery();
  const router = useRouter();
  const overviewQuery = useOverviewQuery();
  const overview = overviewQuery.data;
  const counts = overview ? countWork(overview.work) : {};
  const scores = overview ? gradedWork(overview.work).map((item) => item.score as number) : [];
  const average = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
  const go = (name: string) =>
    router.push(`${user?.role === "teacher" ? "/(teacher)" : "/(student)"}/${name}` as never);

  return (
    <Screen>
      <Animated.View entering={FadeInDown.springify()} style={styles.hero}>
        <CachedAvatar label={user?.displayName ?? "U"} size={72} />
        <Text style={typography.title}>{user?.displayName}</Text>
        <Text style={[typography.body, { color: theme.colors.onSurfaceVariant }]}>{user?.email}</Text>
        <Text style={typography.caption}>
          {user?.role === "teacher" ? "Vai trò giáo viên" : "Vai trò học sinh"}
        </Text>
      </Animated.View>

      {overviewQuery.isError ? (
        <ClassRequestError
          error={overviewQuery.error}
          operation="list"
          onRetry={() => void overviewQuery.refetch({ cancelRefetch: false })}
        />
      ) : null}

      {overview ? (
        <>
          <SectionHeader title="Tổng quan của tôi" />
          <TileGrid>
            <Tile icon="albums-outline" label="Lớp học" hint={`${overview.classes.length} lớp`} onPress={() => go("classes")} />
            <Tile
              icon="create-outline"
              label={user?.role === "teacher" ? "Bài cần chấm" : "Bài cần nộp"}
              badge={user?.role === "teacher" ? counts.needs_grading ?? 0 : counts.todo ?? 0}
              hint="Mở tab Việc"
              onPress={() => go("work")}
            />
            <Tile icon="calendar-outline" label="Lịch học" hint={`${overview.sessions.length} buổi/tuần`} onPress={() => go("schedule")} />
            {user?.role === "student" ? (
              <Tile
                icon="stats-chart-outline"
                label="Bảng điểm"
                hint={average === null ? "Chưa có điểm" : `Trung bình ${average}/10`}
                onPress={() => router.push("/gradebook")}
              />
            ) : null}
          </TileGrid>
        </>
      ) : null}

      <View style={styles.block}>
        <Text style={typography.label}>PHIÊN LÀM VIỆC</Text>
        <Text style={typography.body}>
          {meQuery.isPending
            ? "Đang xác thực /me…"
            : meQuery.isError
              ? meQuery.error.message
              : `Core xác nhận: ${meQuery.data?.user.email ?? user?.email}`}
        </Text>
        <Divider style={styles.divider} />
        <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>Auth · {AUTH_URL}</Text>
        <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>Core · {CORE_URL}</Text>
      </View>

      <AppButton
        mode="contained-tonal"
        onPress={() => {
          notifySuccess();
          void logout();
        }}
      >
        Đăng xuất
      </AppButton>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xxl },
  block: { gap: spacing.sm, marginBottom: spacing.xxl },
  divider: { marginVertical: spacing.sm },
});
