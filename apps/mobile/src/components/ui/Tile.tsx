// Tile - generic pressable tile for dashboard quick actions
import { type ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Text, useTheme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { elevation, radius, spacing, typography } from "@/src/theme/tokens";
import { impactLight } from "@/src/lib/haptics";

type IconName = ComponentProps<typeof Ionicons>["name"];

/** Tiêu đề nhóm kiểu FAP: thanh màu nhấn bên trái + chữ in hoa. */
export function SectionHeader({ title }: { title: string }) {
  const theme = useTheme();
  return (
    <View style={styles.header} accessibilityRole="header">
      <View style={[styles.bar, { backgroundColor: theme.colors.tertiary }]} />
      <Text style={[typography.label, styles.headerText, { color: theme.colors.onSurface }]}>{title.toUpperCase()}</Text>
    </View>
  );
}

type TileProps = {
  icon: IconName;
  label: string;
  hint?: string;
  badge?: number;
  tint?: string;
  delay?: number;
  onPress: () => void;
};

/** Ô lối tắt trong lưới 2 cột; badge hiện số việc đang chờ. */
export function Tile({ icon, label, hint, badge, tint, delay = 0, onPress }: TileProps) {
  const theme = useTheme();
  const color = tint ?? theme.colors.primary;
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={styles.cell}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={badge ? `${label}, ${badge} mục` : label}
        onPress={() => {
          impactLight();
          onPress();
        }}
        style={({ pressed }) => [
          styles.tile,
          elevation.card,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline, opacity: pressed ? 0.9 : 1 },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: theme.colors.primaryContainer }]}>
          <Ionicons name={icon} size={26} color={color} />
          {badge ? (
            <View style={[styles.badge, { backgroundColor: theme.colors.error }]}>
              <Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={[typography.caption, styles.label, { color: theme.colors.onSurface }]} numberOfLines={2}>
          {label}
        </Text>
        {hint ? (
          <Text style={[styles.hint, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>{hint}</Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

export function TileGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.md },
  bar: { width: 4, height: 18, borderRadius: 2 },
  headerText: { letterSpacing: 0.8 },
  // space-between + fixed ~48% tránh %width + gap làm ô đè/xuống hàng lệch
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: spacing.md,
  },
  cell: { width: "48%", maxWidth: "48%", flexGrow: 0, flexShrink: 0 },
  tile: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 118,
    justifyContent: "center",
    overflow: "hidden",
    width: "100%",
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    // giữ badge trong ô icon, không tràn sang tile bên cạnh
    overflow: "visible",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  badgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  label: { textAlign: "center", fontWeight: "700" },
  hint: { fontSize: 11, textAlign: "center", paddingHorizontal: 2 },
});
