import { createElement, useMemo, useState } from "react";
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

function pad(value: number) {
  return String(value).padStart(2, "0");
}

type Props = {
  label: string;
  value: string;
  onChange: (next: string) => void;
};

const HOURS = Array.from({ length: 24 }, (_, index) => index);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

/** Chọn giờ chạy được trên web (input time + lưới) và native. */
export function TimePickerField({ label, value, onChange }: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const current = useMemo(() => parseHm(value), [value]);
  const hour = current.getHours();
  const minute = current.getMinutes();

  const apply = (nextHour: number, nextMinute: number) => {
    onChange(`${pad(nextHour)}:${pad(nextMinute)}`);
  };

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
      <View
        style={[
          styles.row,
          { borderColor: theme.colors.outline, backgroundColor: theme.colors.surface },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: theme.colors.primaryContainer }]}>
          <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
        </View>
        <View style={styles.body}>
          <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
          {Platform.OS === "web" ? (
            createElement("input", {
              type: "time",
              value,
              "aria-label": label,
              onChange: (event: { target: { value: string } }) => {
                const next = event.target.value;
                if (/^\d{2}:\d{2}$/.test(next)) onChange(next);
              },
              style: {
                border: "none",
                background: "transparent",
                color: theme.colors.onSurface,
                fontSize: 20,
                fontWeight: 700,
                fontFamily: '"Be Vietnam Pro", "Segoe UI", sans-serif',
                width: "100%",
                padding: 0,
              },
            })
          ) : (
            <Pressable accessibilityRole="button" accessibilityLabel={`${label} ${value}`} onPress={() => setOpen(true)}>
              <Text style={[typography.title, { color: theme.colors.onSurface }]}>{value}</Text>
            </Pressable>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Chọn ${label}`}
          onPress={() => setOpen((currentOpen) => !currentOpen)}
          hitSlop={8}
        >
          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={theme.colors.onSurfaceVariant} />
        </Pressable>
      </View>

      {open ? (
        <View style={[styles.grid, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surface }]}>
          <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>Giờ</Text>
          <View style={styles.chips}>
            {HOURS.map((item) => {
              const selected = item === hour;
              return (
                <Pressable
                  key={`h-${item}`}
                  onPress={() => apply(item, minute)}
                  style={[
                    styles.chip,
                    { backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceVariant },
                  ]}
                >
                  <Text style={{ color: selected ? theme.colors.onPrimary : theme.colors.onSurface, fontWeight: "700" }}>
                    {pad(item)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>Phút</Text>
          <View style={styles.chips}>
            {MINUTES.map((item) => {
              const selected = item === minute;
              return (
                <Pressable
                  key={`m-${item}`}
                  onPress={() => apply(hour, item)}
                  style={[
                    styles.chip,
                    { backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceVariant },
                  ]}
                >
                  <Text style={{ color: selected ? theme.colors.onPrimary : theme.colors.onSurface, fontWeight: "700" }}>
                    {pad(item)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {Platform.OS !== "web" && open ? (
        <DateTimePicker
          mode="time"
          value={current}
          is24Hour
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onPick}
        />
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
  grid: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: {
    minWidth: 44,
    minHeight: 36,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
});
