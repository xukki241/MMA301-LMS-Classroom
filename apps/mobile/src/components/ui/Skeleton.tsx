import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "react-native-paper";
import { radius, spacing } from "@/src/theme/tokens";

type BoneProps = {
  width?: number | `${number}%`;
  height?: number;
  rounded?: number;
  style?: object;
};

export function SkeletonBone({ width = "100%", height = 14, rounded = radius.sm, style }: BoneProps) {
  const theme = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1100 }), -1, false);
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0.35, 0.9, 0.35]),
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: rounded,
          backgroundColor: theme.colors.surfaceVariant,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function ClassListSkeleton() {
  return (
    <View style={styles.list}>
      {Array.from({ length: 4 }).map((_, index) => (
        <View key={index} style={styles.card}>
          <SkeletonBone width={44} height={44} rounded={radius.md} />
          <View style={styles.meta}>
            <SkeletonBone width="70%" height={16} />
            <SkeletonBone width="40%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function HomeSkeleton() {
  return (
    <View style={styles.home}>
      <SkeletonBone width="55%" height={28} />
      <SkeletonBone width="35%" height={14} />
      <View style={styles.row}>
        <SkeletonBone width="47%" height={88} rounded={radius.lg} />
        <SkeletonBone width="47%" height={88} rounded={radius.lg} />
      </View>
      <SkeletonBone width="100%" height={120} rounded={radius.lg} />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md, paddingTop: spacing.sm },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
  meta: { flex: 1, gap: spacing.sm },
  home: { gap: spacing.md, paddingTop: spacing.sm },
  row: { flexDirection: "row", justifyContent: "space-between" },
});
