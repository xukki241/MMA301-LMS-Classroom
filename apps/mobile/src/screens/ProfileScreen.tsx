import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Text, useTheme } from "react-native-paper";
import { Screen } from "@/src/components/ui/Screen";
import { AppButton } from "@/src/components/ui/AppButton";
import { CachedAvatar } from "@/src/components/ui/CachedAvatar";
import { useAuth } from "@/src/lib/auth-context";
import { useRouter } from "expo-router";
import { useOverviewQuery } from "@/src/lib/hooks";
import { countWork, gradedWork, presentWork } from "@/src/lib/overview-api";
import { SectionHeader, Tile, TileGrid } from "@/src/components/ui/Tile";
import { ClassRequestError } from "@/src/components/ui/ClassRequestError";
import { notifySuccess } from "@/src/lib/haptics";
import { spacing, typography } from "@/src/theme/tokens";

export function ProfileScreen() {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const router = useRouter();
  const overviewQuery = useOverviewQuery();
  const overview = overviewQuery.data;
  const counts = overview ? countWork(presentWork(overview.work)) : {};
  const scores = overview ? gradedWork(overview.work).map((item) => item.score as number) : [];
  const average = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
  const go = (name: string) =>
    router.push(`${user?.role === "teacher" ? "/(teacher)" : "/(student)"}/${name}` as never);

  return (
    <Screen>
      <Animated.View entering={FadeInDown.springify()} style={styles.hero}>
        <CachedAvatar label={user?.displayName ?? "U"} size={72} />
        <Text style={typography.title} numberOfLines={2}>
          {user?.displayName}
        </Text>
        <Text style={[typography.body, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
          {user?.email}
        </Text>
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

      <SectionHeader title="Tài khoản" />
      <TileGrid>
        <Tile
          icon="person-outline"
          label="Thông tin"
          hint="Xem / sửa tên hiển thị"
          onPress={() => router.push("/account" as never)}
        />
        <Tile
          icon="lock-closed-outline"
          label="Đổi mật khẩu"
          hint="Cập nhật mật khẩu"
          onPress={() => router.push("/change-password" as never)}
        />
      </TileGrid>

      {overview ? (
        <>
          <SectionHeader title="Lối tắt" />
          <TileGrid>
            <Tile icon="albums-outline" label="Lớp học" hint={`${overview.classes.length} lớp`} onPress={() => go("classes")} />
            <Tile
              icon="create-outline"
              label={user?.role === "teacher" ? "Bài cần chấm" : "Bài cần nộp"}
              badge={user?.role === "teacher" ? counts.needs_grading ?? 0 : counts.todo ?? 0}
              hint="Mở tab Việc"
              onPress={() => go("work")}
            />
            <Tile
              icon="card-outline"
              label="Giao dịch"
              hint={user?.role === "teacher" ? "Mở khóa trong lớp" : "Mở khóa SePay"}
              onPress={() => router.push("/payments" as never)}
            />
            <Tile
              icon="document-attach-outline"
              label="Nộp bài"
              hint={user?.role === "teacher" ? "Bài học sinh nộp" : "Bài đã nộp"}
              onPress={() => router.push("/submissions" as never)}
            />
            {user?.role === "student" ? (
              <Tile
                icon="stats-chart-outline"
                label="Bảng điểm"
                hint={average === null ? "Chưa có điểm" : `TB ${average}/10`}
                onPress={() => router.push("/gradebook")}
              />
            ) : (
              <Tile
                icon="calendar-outline"
                label="Lịch"
                hint={`${overview.sessions.length} buổi/tuần`}
                onPress={() => go("schedule")}
              />
            )}
          </TileGrid>
        </>
      ) : null}

      <View style={styles.logoutWrap}>
        <AppButton
          mode="contained-tonal"
          onPress={() => {
            notifySuccess();
            void logout();
          }}
        >
          Đăng xuất
        </AppButton>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xxl },
  logoutWrap: { marginTop: spacing.xxl, marginBottom: spacing.xl },
});
