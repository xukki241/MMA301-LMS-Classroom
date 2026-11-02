import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Text, useTheme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { radius, spacing, typography } from "@/src/theme/tokens";

function parseHm(value: string): Date {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  const date = new Date();
  if (!match) {
    date.setHours(7, 30, 0, 0);
    return date;
  }
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return date;
}

function formatHm(date: Date): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

type Props = {
  label: string;
  value: string;
  onChange: (next: string) => void;
};

/** Hàng chọn giờ kiểu Stitch — không dùng ô text HH:mm. */
export function TimePickerField({ label, value, onChange }: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const onPick = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setOpen(false);
    if (event.type === "dismissed") {
      setOpen(false);
      return;
    }
    if (selected) onChange(formatHm(selected));
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} ${value}`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.row,
          {
            borderColor: theme.colors.outline,
            backgroundColor: theme.colors.surface,
            opacity: pressed ? 0.88 : 1,
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: theme.colors.primaryContainer }]}>
          <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
        </View>
        <View style={styles.body}>
          <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
          <Text style={[typography.title, { color: theme.colors.onSurface }]}>{value}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.onSurfaceVariant} />
      </Pressable>
      {open ? (
        <DateTimePicker
          mode="time"
          value={parseHm(value)}
          is24Hour
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onPick}
        />
      ) : null}
      {Platform.OS === "ios" && open ? (
        <Pressable onPress={() => setOpen(false)} style={styles.done}>
          <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>Xong</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  row: {
    minHeight: 64,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: 2 },
  done: { alignSelf: "flex-end", paddingVertical: spacing.sm, minHeight: 44, justifyContent: "center" },
});
