import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, type ComponentProps } from "react";
import { Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ActivityIndicator, Text, useTheme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ClassListSkeleton } from "@/src/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/src/components/ui/EmptyState";
import { ClassRequestError } from "@/src/components/ui/ClassRequestError";
import { CachedAvatar } from "@/src/components/ui/CachedAvatar";
import { useAuth } from "@/src/lib/auth-context";
import { getClass, getClassMembers } from "@/src/lib/classes-api";
import { queryKeys } from "@/src/lib/query-client";
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
    queryFn: ({ signal }) => getClass(token!, classId!, signal),
    staleTime: 0,
  });
  const membersQuery = useQuery({
    queryKey: queryKeys.members(user?.id ?? "", classId ?? ""),
    enabled: Boolean(token && user && classId && query.isSuccess),
    queryFn: ({ signal }) => getClassMembers(token!, classId!, signal),
    staleTime: 0,
  });
  const { refetch } = query;
  useFocusEffect(useCallback(() => {
    if (token && user && classId) void refetch();
  }, [token, user, classId, refetch]));

  const item = query.isError ? undefined : query.data?.class;
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
            <Text style={typography.body}>
              {member.roleInClass === "teacher" ? "Giáo viên" : "Học sinh"}
              {member.userId === user?.id ? ` · ${user.displayName} (Bạn)` : ""}
            </Text>
            <Text selectable style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
              Mã thành viên · {member.userId}
            </Text>
          </View>
        ))}
      </View>

      <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.modules}>
        <Pressable accessibilityRole="button" accessibilityLabel="Mở bảng tin lớp học"
          onPress={() => router.push({ pathname: "/class/[id]/stream", params: { id: classId } })}>
          <ModuleCard icon="newspaper-outline" title="Bảng tin" subtitle="Thông báo và bình luận của lớp" />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Mở tài liệu lớp học"
          onPress={() => router.push({ pathname: "/class/[id]/materials", params: { id: classId, name: item?.name } })}>
          <ModuleCard icon="document-text-outline" title="Tài liệu" subtitle="Tài liệu bài giảng và liên kết học tập" />
        </Pressable>
        <ModuleCard icon="create-outline" title="Bài tập" subtitle="Exercise → nộp → chấm điểm" />
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.lg },
  code: { alignItems: "center", gap: spacing.sm, padding: spacing.lg, borderRadius: radius.md },
  members: { gap: spacing.md, marginVertical: spacing.lg },
  member: { gap: spacing.xs, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
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
