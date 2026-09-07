import { StyleSheet, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Text, useTheme } from "react-native-paper";
import type { ChatMessage } from "@/src/chat/types";
import { radius, spacing, typography } from "@/src/theme/tokens";

export function MessageBubble({ item, index }: { item: ChatMessage; index: number }) {
  const theme = useTheme();
  const mine = item.mine;
  return (
    <Animated.View
      entering={FadeInUp.delay(Math.min(index, 8) * 40)}
      style={[styles.row, mine ? styles.right : styles.left]}
    >
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: mine ? theme.colors.primary : theme.colors.surface,
            borderColor: theme.colors.outline,
          },
        ]}
      >
        {mine ? null : (
          <Text style={[typography.caption, { color: theme.colors.primary }]}>{item.authorName}</Text>
        )}
        <Text style={[typography.body, { color: mine ? "#fff" : theme.colors.onSurface }]}>{item.text}</Text>
        <Text style={[styles.time, { color: mine ? "rgba(255,255,255,0.8)" : theme.colors.onSurfaceVariant }]}>
          {item.createdAt}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: spacing.sm, maxWidth: "84%" },
  left: { alignSelf: "flex-start" },
  right: { alignSelf: "flex-end" },
  bubble: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  time: { fontSize: 11, marginTop: 2 },
});
