import { createElement, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Text, useTheme } from "react-native-paper";
import { TimePickerField } from "@/src/components/ui/TimePickerField";
import { radius, spacing, typography } from "@/src/theme/tokens";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function asDate(iso: string): Date {
  const parsed = new Date(iso);
  if (Number.isFinite(parsed.getTime())) return parsed;
  const fallback = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  fallback.setSeconds(0, 0);
  return fallback;
}

function datePart(value: Date) {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function timePart(value: Date) {
  return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function toIso(dateText: string, timeText: string): string | null {
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText);
  const time = /^(\d{2}):(\d{2})$/.exec(timeText);
  if (!date || !time) return null;
  const next = new Date(
    Number(date[1]),
    Number(date[2]) - 1,
    Number(date[3]),
    Number(time[1]),
    Number(time[2]),
    0,
    0,
  );
  return Number.isFinite(next.getTime()) ? next.toISOString() : null;
}

type Props = {
  value: string;
  onChange: (iso: string) => void;
};

/** Hạn nộp theo ngày + giờ địa phương. Không hiện chuỗi ISO. */
export function DeadlineField({ value, onChange }: Props) {
  const theme = useTheme();
  const current = asDate(value);
  const dateText = datePart(current);
  const timeText = timePart(current);
  const [dateOpen, setDateOpen] = useState(false);

  const commit = (nextDate: string, nextTime: string) => {
    const iso = toIso(nextDate, nextTime);
    if (iso) onChange(iso);
  };

  const onNativeDate = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setDateOpen(false);
    if (event.type === "dismissed" || !selected) return;
    commit(datePart(selected), timeText);
  };

  const label = current.toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" });

  return (
    <View style={styles.wrap}>
      <Text style={typography.subtitle}>Hạn nộp</Text>
      <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      {Platform.OS === "web" ? (
        createElement("input", {
          type: "date",
          value: dateText,
          "aria-label": "Ngày hạn nộp",
          onChange: (event: { target: { value: string } }) => commit(event.target.value, timeText),
          style: {
            minHeight: 48,
            border: `1px solid ${theme.colors.outline}`,
            borderRadius: 12,
            padding: "8px 12px",
            fontSize: 16,
            fontFamily: '"Be Vietnam Pro", "Segoe UI", sans-serif',
            color: theme.colors.onSurface,
            background: theme.colors.surface,
          },
        })
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ngày hạn nộp ${label}`}
          onPress={() => setDateOpen(true)}
          style={[styles.dateBtn, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surface }]}
        >
          <Text style={typography.body}>{dateText.split("-").reverse().join("/")}</Text>
        </Pressable>
      )}
      {Platform.OS !== "web" && dateOpen ? (
        <DateTimePicker mode="date" value={current} onChange={onNativeDate} />
      ) : null}
      <TimePickerField label="Giờ hạn nộp" value={timeText} onChange={(next) => commit(dateText, next)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  dateBtn: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
});
