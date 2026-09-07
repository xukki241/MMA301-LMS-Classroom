import { type ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Chip, Text, useTheme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/lib/auth-context";
import { useClassesQuery } from "@/src/lib/hooks";
import { ClassListSkeleton } from "@/src/components/ui/Skeleton";
import { Screen } from "@/src/components/ui/Screen";
import { ClassCard } from "@/src/components/ui/ClassCard";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { isNotFound } from "@/src/lib/http";
import { elevation, radius, spacing, typography } from "@/src/theme/tokens";
import { impactLight } from "@/src/lib/haptics";

function QuickAction({
  icon,
  label,
  onPress,
  delay,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  delay: number;
}) {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={styles.quickItem}>
      <Pressable
        onPress={() => {
          impactLight();
          onPress();
        }}
        style={({ pressed }) => [
          styles.quick,
          elevation.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outline,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <Ionicons name={icon} size={22} color={theme.colors.primary} />
        <Text style={typography.caption}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function HomeDashboard({ role }: { role: "teacher" | "student" }) {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const classesQuery = useClassesQuery();
  const classes = classesQuery.data ?? [];
  const isTeacher = role === "teacher";

  return (
    <Screen>
      <Animated.View entering={FadeInDown.springify()} style={styles.hero}>
        <Chip compact selected>
          {isTeacher ? "Giáo viên" : "Học sinh"}
        </Chip>
        <Text style={typography.display}>Xin chào, {user?.displayName?.split(" ")[0] ?? "bạn"}</Text>
        <Text style={[typography.body, { color: theme.colors.onSurfaceVariant }]}>
          {isTeacher
            ? "Tạo lớp, đăng tài liệu và theo dõi bài tập trong một không gian."
            : "Tham gia lớp bằng mã, xem bảng tin và nộp bài đúng hạn."}
        </Text>
      </Animated.View>

      <View style={styles.quickRow}>
        <QuickAction
          icon="albums-outline"
          label="Lớp học"
          delay={80}
          onPress={() => router.push(isTeacher ? "/(teacher)/classes" : "/(student)/classes")}
        />
        <QuickAction
          icon="chatbubbles-outline"
          label="Chat"
          delay={140}
          onPress={() => router.push(isTeacher ? "/(teacher)/chat" : "/(student)/chat")}
        />
        <QuickAction
          icon="person-circle-outline"
          label="Hồ sơ"
          delay={200}
          onPress={() => router.push(isTeacher ? "/(teacher)/profile" : "/(student)/profile")}
        />
      </View>

      <Text style={[typography.subtitle, styles.section]}>Lớp gần đây</Text>
      {classesQuery.isPending ? <ClassListSkeleton /> : null}
      {classesQuery.isError && !isNotFound(classesQuery.error) ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Không tải được lớp"
          subtitle={classesQuery.error.message}
          actionLabel="Thử lại"
          onAction={() => void classesQuery.refetch()}
        />
      ) : null}
      {!classesQuery.isPending && (classes.length === 0 || isNotFound(classesQuery.error)) ? (
        <EmptyState
          icon="school-outline"
          title="Chưa có lớp nào"
          subtitle={
            isNotFound(classesQuery.error)
              ? "API lớp chưa sẵn sàng trên Core. Giao diện list/detail đã sẵn."
              : isTeacher
                ? "Tạo lớp đầu tiên từ tab Lớp học."
                : "Nhập mã lớp ở tab Lớp học để tham gia."
          }
        />
      ) : null}
      {classes.slice(0, 3).map((item, index) => (
        <ClassCard
          key={item.id}
          item={item}
          index={index}
          onPress={() => router.push({ pathname: "/class/[id]", params: { id: item.id, name: item.name, code: item.code } })}
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.sm, paddingTop: spacing.md, paddingBottom: spacing.lg },
  quickRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.xl },
  quickItem: { flex: 1 },
  quick: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  section: { marginBottom: spacing.md },
});
