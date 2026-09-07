import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import { Text, useTheme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { CachedAvatar } from "./CachedAvatar";
import { elevation, radius, spacing, typography } from "@/src/theme/tokens";
import type { LmsClass } from "@/src/lib/classes-api";
import { impactLight } from "@/src/lib/haptics";

type Props = {
  item: LmsClass;
  index: number;
  onPress: () => void;
};

export function ClassCard({ item, index, onPress }: Props) {
  const theme = useTheme();

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 70).springify()}
      layout={LinearTransition.springify()}
      style={styles.wrap}
    >
      <Pressable
        onPress={() => {
          impactLight();
          onPress();
        }}
        style={({ pressed }) => [
          styles.card,
          elevation.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outline,
            opacity: pressed ? 0.92 : 1,
            transform: [{ scale: pressed ? 0.985 : 1 }],
          },
        ]}
      >
        <CachedAvatar label={item.name} />
        <View style={styles.meta}>
          <Text style={typography.subtitle} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
            Mã lớp · {item.code || "—"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.onSurfaceVariant} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  meta: { flex: 1, gap: 2 },
});
