// MonthCalendar - monthly grid calendar with event dot indicators
import { Pressable, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { sameDay, startOfDay, WEEKDAY_LABELS } from "@/src/lib/overview-api";
import { palette, radius, spacing, typography } from "@/src/theme/tokens";

const DOW = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;

export type MarkedCounts = Map<number, number> | Record<number, number>;

function monthMatrix(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(first.getFullYear(), first.getMonth(), 1 - startOffset);
  return Array.from({ length: 42 }, (_, i) =>
    new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i)
  );
}

function countForDay(counts: MarkedCounts | undefined, dayTs: number): number {
  if (!counts) return 0;
  if (counts instanceof Map) return counts.get(dayTs) ?? 0;
  return counts[dayTs] ?? 0;
}

/**
 * Lịch tháng: badge xanh = buổi học, đỏ = kỳ kiểm tra (có thể cùng ngày).
 * Nút ‹ › đổi tháng — đủ để “xem các tuần” trong tháng.
 */
export function MonthCalendar({
  month,
  selected,
  studyCounts,
  examCounts,
  onSelect,
  onChangeMonth,
}: {
  month: Date;
  selected: Date;
  studyCounts?: MarkedCounts;
  examCounts?: MarkedCounts;
  onSelect: (day: Date) => void;
  onChangeMonth: (next: Date) => void;
}) {
  const theme = useTheme();
  const today = startOfDay(new Date());
  const cells = monthMatrix(month);
  const title = month.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });

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
          <Text style={{ color: theme.colors.primary, fontWeight: "700", fontSize: 22 }}>‹</Text>
        </Pressable>
        <Text style={typography.subtitle}>{title}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tháng sau"
          hitSlop={8}
          onPress={() => onChangeMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          style={styles.nav}
        >
          <Text style={{ color: theme.colors.primary, fontWeight: "700", fontSize: 22 }}>›</Text>
        </Pressable>
      </View>

      <View style={styles.legend}>
        {studyCounts !== undefined ? (
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: palette.success }]} />
            <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>Lịch học</Text>
          </View>
        ) : null}
        {examCounts !== undefined ? (
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: palette.danger }]} />
            <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>Kiểm tra</Text>
          </View>
        ) : null}
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
          const dayTs = startOfDay(day).getTime();
          const study = countForDay(studyCounts, dayTs);
          const exams = countForDay(examCounts, dayTs);
          const parts: string[] = [];
          if (study) parts.push(`${study} buổi học`);
          if (exams) parts.push(`${exams} kỳ kiểm tra`);
          const markLabel = parts.length ? parts.join(", ") : "trống";

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
              <View style={styles.marks}>
                {study > 0 ? <View style={[styles.dot, { backgroundColor: palette.success }]} /> : null}
                {exams > 0 ? <View style={[styles.dot, { backgroundColor: palette.danger }]} /> : null}
                {study === 0 && exams === 0 ? <View style={styles.markSpacer} /> : null}
              </View>
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
  legend: { flexDirection: "row", gap: spacing.lg, paddingHorizontal: spacing.xs },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dowRow: { flexDirection: "row" },
  dow: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: "14.2857%",
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: radius.md,
    minHeight: 48,
  },
  dayNum: { fontSize: 13 },
  marks: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    marginTop: 4,
    minHeight: 8,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  markSpacer: { width: 7, height: 7 },
});
