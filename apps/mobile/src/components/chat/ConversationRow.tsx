import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInRight } from "react-native-reanimated";
import { Text, useTheme } from "react-native-paper";
import { CachedAvatar } from "@/src/components/ui/CachedAvatar";
import type { Conversation } from "@/src/chat/types";
import { elevation, radius, spacing, typography } from "@/src/theme/tokens";
import { impactLight } from "@/src/lib/haptics";

export function ConversationRow({
  item,
  index,
  onPress,
}: {
  item: Conversation;
  index: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeInRight.delay(index * 60).springify()}>
      <Pressable
        onPress={() => {
          impactLight();
          onPress();
        }}
        style={({ pressed }) => [
          styles.row,
          elevation.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outline,
            opacity: pressed ? 0.92 : 1,
          },
        ]}
      >
        <CachedAvatar label={item.avatarLabel} />
        <View style={styles.meta}>
          <View style={styles.top}>
            <Text style={typography.subtitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>{item.lastAt}</Text>
          </View>
          <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
            {item.subtitle}
          </Text>
          <Text style={typography.body} numberOfLines={1}>
            {item.lastMessage}
          </Text>
        </View>
        {item.unread > 0 ? (
          <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.badgeText}>{item.unread}</Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.md,
  },
  meta: { flex: 1, gap: 2 },
  top: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    alignSelf: "center",
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
