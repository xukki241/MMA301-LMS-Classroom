import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, type ComponentProps } from "react";
import { Alert, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ActivityIndicator, Text, useTheme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ClassListSkeleton } from "@/src/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/src/components/ui/EmptyState";
import { ClassRequestError } from "@/src/components/ui/ClassRequestError";
import { CachedAvatar } from "@/src/components/ui/CachedAvatar";
import { useAuth } from "@/src/lib/auth-context";
import { getClassMembers } from "@/src/lib/classes-api";
import { useOverviewQuery } from "@/src/lib/hooks";
import { removeMember } from "@/src/lib/schedule-api";
import { dueSoon, filterWork, gradedWork, upcomingExams, upcomingSessions } from "@/src/lib/overview-api";
import { ExamRow, SessionRow, WorkRow } from "@/src/components/schedule/Rows";
import { SectionHeader } from "@/src/components/ui/Tile";
import { userErrorMessage } from "@/src/lib/user-error-message";
import { notifyError, notifySuccess } from "@/src/lib/haptics";
import { cachedClassDetail } from "@/src/lib/offline-data";
import { queryClient, queryKeys } from "@/src/lib/query-client";
import { elevation, radius, spacing, typography } from "@/src/theme/tokens";

function ModuleCard({
  icon,
  title,
  subtitle,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.module,
        elevation.card,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
      ]}
    >
      <Ionicons name={icon} size={20} color={theme.colors.primary} />
      <View style={styles.moduleMeta}>
        <Text style={typography.subtitle}>{title}</Text>
        <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>{subtitle}</Text>
      </View>
    </View>
  );
}

export default function ClassDetailScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const router = useRouter();
  const { token, user } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const classId = Array.isArray(id) ? id[0] : id;

  const query = useQuery({
    queryKey: queryKeys.class(user?.id ?? "", classId ?? ""),
    enabled: Boolean(token && user && classId),
    queryFn: ({ signal }) => cachedClassDetail(token!, user!.id, user!.role, classId!, signal),
    networkMode: "always",
    staleTime: 0,
  });
  const membersQuery = useQuery({
    queryKey: queryKeys.members(user?.id ?? "", classId ?? ""),
    enabled: Boolean(token && user && classId && query.isSuccess),
    queryFn: ({ signal }) => getClassMembers(token!, classId!, signal),
    staleTime: 0,
  });
  const overviewQuery = useOverviewQuery();
  const isOwnerTeacher = user?.role === "teacher" && query.data?.roleInClass === "teacher";
  const removeMutation = useMutation({
    mutationFn: (memberUserId: string) => removeMember(token!, classId!, memberUserId),
    onSuccess: () => {
      notifySuccess();
      void queryClient.invalidateQueries({ queryKey: queryKeys.members(user!.id, classId!) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.overview(user!.id) });
    },
    onError: (error) => {
      notifyError();
      Alert.alert("Không thể gỡ học sinh", userErrorMessage(error));
    },
  });
  const confirmRemove = (memberUserId: string, name: string) =>
    Alert.alert("Gỡ học sinh khỏi lớp?", `${name} sẽ không còn thấy lớp này.`, [
      { text: "Hủy", style: "cancel" },
      { text: "Gỡ", style: "destructive", onPress: () => removeMutation.mutate(memberUserId) },
    ]);
  const { refetch } = query;
  useFocusEffect(useCallback(() => {
    if (token && user && classId) void refetch();
  }, [token, user, classId, refetch]));

  const item = query.isError ? undefined : query.data?.class;
  const now = new Date();
  const overview = overviewQuery.data;
  const classOverview = overview && classId
    ? {
        sessions: overview.sessions.filter((s) => s.classId === classId),
        exams: overview.exams.filter((e) => e.classId === classId),
        work: overview.work.filter((w) => w.classId === classId),
      }
    : undefined;
  const nextSessions = classOverview ? upcomingSessions(classOverview.sessions, now, 7).slice(0, 2) : [];
  const nextExam = classOverview ? upcomingExams(classOverview.exams, now, 60)[0] : undefined;
  const attention = classOverview
    ? (user?.role === "teacher" ? filterWork(classOverview.work, "needs_grading") : dueSoon(classOverview.work, now, 14)).slice(0, 2)
    : [];
  const latestGrade = classOverview && user?.role === "student" ? gradedWork(classOverview.work).slice(-1)[0] : undefined;
  const title = item?.name ?? "Chi tiết lớp";

  useEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  if (!classId) {
    return <Screen><ErrorState message="Không tìm thấy lớp học." /></Screen>;
  }

  if (query.isPending) {
    return (
      <Screen>
        <ClassListSkeleton />
      </Screen>
    );
  }

  if (query.isError) {
    return (
      <Screen>
        <ClassRequestError error={query.error} operation="detail" onRetry={() => void query.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen refreshControl={
      <RefreshControl
        refreshing={query.isRefetching || membersQuery.isRefetching}
        tintColor={theme.colors.primary}
        onRefresh={() => {
          void query.refetch().then((result) => {
            if (result.isSuccess) void membersQuery.refetch();
          });
        }}
      />
    }>
      <Animated.View entering={FadeInDown.springify()} style={styles.hero}>
        <CachedAvatar label={title} size={56} />
        <Text style={typography.title}>{title}</Text>
        {user?.role === "teacher" && query.data?.roleInClass === "teacher" ? (
          <View style={[styles.code, { backgroundColor: theme.colors.primaryContainer }]}>
            <Text style={typography.caption}>Mã lớp · Chia sẻ với học sinh</Text>
            <Text selectable style={[typography.display, { color: theme.colors.primary }]}>{item?.code}</Text>
          </View>
        ) : null}
        {item ? <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
          Ngày tạo · {new Date(item.createdAt).toLocaleDateString("vi-VN")}
        </Text> : null}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.modules}>
        <Pressable accessibilityRole="button" accessibilityLabel="Mở bảng tin lớp học"
          onPress={() => router.push({ pathname: "/class/[id]/stream", params: { id: classId } })}>
          <ModuleCard icon="newspaper-outline" title="Bảng tin" subtitle="Thông báo và bình luận của lớp" />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Mở lịch học và kiểm tra của lớp"
          onPress={() => router.push({ pathname: "/class/[id]/schedule", params: { id: classId } })}>
          <ModuleCard
            icon="calendar-outline"
            title="Lịch học và kiểm tra"
            subtitle={user?.role === "teacher" ? "Thêm, xóa buổi học và kỳ kiểm tra" : "Buổi học hằng tuần và kỳ kiểm tra"}
          />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Mở tài liệu lớp học"
          onPress={() => router.push({ pathname: "/class/[id]/materials", params: { id: classId, name: item?.name } })}>
          <ModuleCard
            icon="document-text-outline"
            title="Tài nguyên"
            subtitle={user?.role === "teacher" ? "Thêm, sửa, xóa tài liệu và liên kết" : "Tài liệu bài giảng và liên kết học tập"}
          />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Mở bài tập lớp học"
          onPress={() => router.push({ pathname: "/class/[id]/exercises", params: { id: classId, name: item?.name } })}>
          <ModuleCard
            icon="create-outline"
            title="Bài tập"
            subtitle={user?.role === "teacher" ? "Giao bài, xem bài nộp và chấm điểm" : "Nộp bài và xem điểm"}
          />
        </Pressable>
      </Animated.View>

      {classOverview ? (
        <View>
          {nextSessions.length > 0 || nextExam || attention.length > 0 || latestGrade ? (
            <SectionHeader title="Sắp tới trong lớp" />
          ) : null}
          {nextSessions.map(({ session }) => <SessionRow key={session.id + session.weekday} session={session} />)}
          {nextExam ? <ExamRow exam={nextExam} /> : null}
          {attention.map((work) => (
            <WorkRow
              key={work.exerciseId}
              item={work}
              role={user?.role === "teacher" ? "teacher" : "student"}
              onPress={() => router.push({
                pathname: "/class/[id]/exercise/[exerciseId]",
                params: { id: work.classId, exerciseId: work.exerciseId, title: work.title },
              })}
            />
          ))}
          {latestGrade ? (
            <WorkRow
              item={latestGrade}
              role="student"
              onPress={() => router.push({
                pathname: "/class/[id]/exercise/[exerciseId]",
                params: { id: latestGrade.classId, exerciseId: latestGrade.exerciseId, title: latestGrade.title },
              })}
            />
          ) : null}
        </View>
      ) : null}

      <View style={styles.members}>
        <Text style={typography.subtitle}>
          Thành viên{membersQuery.isSuccess ? ` (${membersQuery.data.length})` : ""}
        </Text>
        {membersQuery.isPending ? <ActivityIndicator accessibilityLabel="Đang tải thành viên" /> : null}
        {membersQuery.isError ? (
          <ClassRequestError error={membersQuery.error} operation="members" onRetry={() => void membersQuery.refetch()} />
        ) : null}
        {membersQuery.isSuccess && membersQuery.data.length === 0 ? (
          <EmptyState title="Chưa có thành viên." icon="people-outline" />
        ) : null}
        {membersQuery.isSuccess && membersQuery.data.map((member) => (
          <View key={member._id} style={[styles.member, { borderColor: theme.colors.outline }]}>
            <View style={styles.memberText}>
              <Text style={typography.body}>
                {member.userId === user?.id
                  ? `${user.displayName} (Bạn)`
                  : member.displayName || (member.roleInClass === "teacher" ? "Giáo viên" : "Học sinh")}
              </Text>
              <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
                {member.roleInClass === "teacher" ? "Giáo viên" : "Học sinh"}
              </Text>
            </View>
            {isOwnerTeacher && member.roleInClass === "student" ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Gỡ ${member.displayName || "học sinh"} khỏi lớp`}
                hitSlop={8}
                onPress={() => confirmRemove(member.userId, member.displayName || "Học sinh này")}
                style={styles.remove}
              >
                <Ionicons name="person-remove-outline" size={20} color={theme.colors.error} />
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.lg },
  code: { alignItems: "center", gap: spacing.sm, padding: spacing.lg, borderRadius: radius.md },
  members: { gap: spacing.md, marginVertical: spacing.lg },
  member: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  memberText: { flex: 1, gap: 2 },
  remove: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  modules: { gap: spacing.md, marginTop: spacing.md },
  module: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  moduleMeta: { flex: 1, gap: 2 },
});
