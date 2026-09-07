import { useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, type ComponentProps } from "react";
import { StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Text, useTheme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ClassListSkeleton } from "@/src/components/ui/Skeleton";
import { ErrorState } from "@/src/components/ui/EmptyState";
import { CachedAvatar } from "@/src/components/ui/CachedAvatar";
import { useAuth } from "@/src/lib/auth-context";
import { getClass, type LmsClass } from "@/src/lib/classes-api";
import { queryClient, queryKeys } from "@/src/lib/query-client";
import { isNotFound } from "@/src/lib/http";
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
  const { token } = useAuth();
  const { id, name, code } = useLocalSearchParams<{ id: string; name?: string; code?: string }>();
  const classId = Array.isArray(id) ? id[0] : id;

  const cached = (queryClient.getQueryData<LmsClass[]>(queryKeys.classes) ?? []).find((item) => item.id === classId);

  const query = useQuery({
    queryKey: queryKeys.class(classId ?? ""),
    enabled: Boolean(token && classId),
    queryFn: ({ signal }) => getClass(token!, classId!, signal),
    placeholderData: cached,
  });

  const item = query.data;
  const title = item?.name ?? (Array.isArray(name) ? name[0] : name) ?? "Chi tiết lớp";
  const classCode = item?.code ?? (Array.isArray(code) ? code[0] : code) ?? "—";

  useEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  if (query.isPending && !cached) {
    return (
      <Screen>
        <ClassListSkeleton />
      </Screen>
    );
  }

  if (query.isError && !isNotFound(query.error) && !cached) {
    return (
      <Screen>
        <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Animated.View entering={FadeInDown.springify()} style={styles.hero}>
        <CachedAvatar label={title} size={56} />
        <Text style={typography.title}>{title}</Text>
        <Text style={[typography.body, { color: theme.colors.onSurfaceVariant }]}>Mã tham gia · {classCode}</Text>
        {isNotFound(query.error) ? (
          <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
            Chi tiết API chưa sẵn — đang hiện dữ liệu từ danh sách (nếu có).
          </Text>
        ) : null}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.modules}>
        <ModuleCard icon="newspaper-outline" title="Bảng tin" subtitle="Post + comment — chờ contract stream" />
        <ModuleCard icon="document-text-outline" title="Tài liệu" subtitle="Material list/add — LMS-14" />
        <ModuleCard icon="create-outline" title="Bài tập" subtitle="Exercise → nộp → chấm điểm" />
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.lg },
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
