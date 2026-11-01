import { Pressable, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { sameDay, startOfDay, WEEKDAY_LABELS } from "@/src/lib/overview-api";
import { radius, spacing, typography } from "@/src/theme/tokens";

const DOW = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;

export type CalendarMarkMode = "study" | "exams";
export type MarkedCounts = Map<number, number> | Record<number, number>;

function monthMatrix(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  // Monday-first: JS getDay() Sun=0 → shift so Mon=0
  const startOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(first.getFullYear(), first.getMonth(), 1 - startOffset);
  return Array.from({ length: 42 }, (_, i) =>
    new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i)
  );
}

function countForDay(counts: MarkedCounts, dayTs: number): number {
  if (counts instanceof Map) return counts.get(dayTs) ?? 0;
  return counts[dayTs] ?? 0;
}

export function MonthCalendar({
  month,
  selected,
  markedCounts,
  mode = "study",
  onSelect,
  onChangeMonth,
}: {
  month: Date;
  selected: Date;
  markedCounts: MarkedCounts;
  mode?: CalendarMarkMode;
  onSelect: (day: Date) => void;
  onChangeMonth: (next: Date) => void;
}) {
  const theme = useTheme();
  const today = startOfDay(new Date());
  const cells = monthMatrix(month);
  const title = month.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
  const badgeBg = mode === "exams" ? theme.colors.tertiary : theme.colors.primary;
  const badgeFg = mode === "exams" ? theme.colors.onTertiary : theme.colors.onPrimary;

  return (
    <View style={[styles.wrap, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tháng trước"
          hitSlop={8}
          onPress={() => onChangeMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          style={styles.nav}
        >
          <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>‹</Text>
        </Pressable>
        <Text style={typography.subtitle}>{title}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tháng sau"
          hitSlop={8}
          onPress={() => onChangeMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          style={styles.nav}
        >
          <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>›</Text>
        </Pressable>
      </View>

      <View style={styles.dowRow}>
        {DOW.map((label) => (
          <Text key={label} style={[styles.dow, { color: theme.colors.onSurfaceVariant }]}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day) => {
          const inMonth = day.getMonth() === month.getMonth();
          const selectedDay = sameDay(day, selected);
          const isToday = sameDay(day, today);
          const count = countForDay(markedCounts, startOfDay(day).getTime());
          const markLabel = count > 0
            ? mode === "exams"
              ? `${count} kỳ kiểm tra`
              : `${count} buổi học`
            : "trống";
          return (
            <Pressable
              key={day.toISOString()}
              accessibilityRole="button"
              accessibilityLabel={`${WEEKDAY_LABELS[day.getDay()]} ${day.getDate()}, ${markLabel}`}
              onPress={() => onSelect(startOfDay(day))}
              style={[
                styles.cell,
                selectedDay && { backgroundColor: theme.colors.primaryContainer },
                isToday && !selectedDay && { borderColor: theme.colors.primary, borderWidth: 1 },
              ]}
            >
              <Text
                style={[
                  styles.dayNum,
                  { color: inMonth ? theme.colors.onSurface : theme.colors.outline },
                  selectedDay && { color: theme.colors.primary, fontWeight: "700" },
                ]}
              >
                {day.getDate()}
              </Text>
              {count > 0 ? (
                <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                  <Text style={[styles.badgeText, { color: badgeFg }]}>
                    {count > 9 ? "9+" : String(count)}
                  </Text>
                </View>
              ) : (
                <View style={styles.badgeSpacer} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  nav: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  dowRow: { flexDirection: "row" },
  dow: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: "14.2857%",
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  dayNum: { fontSize: 13 },
  badge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  badgeText: { fontSize: 10, fontWeight: "700", lineHeight: 12 },
  badgeSpacer: { width: 16, height: 16, marginTop: 2 },
});
