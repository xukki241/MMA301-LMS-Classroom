import { Pressable, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { elevation, palette, radius, spacing, typography } from "@/src/theme/tokens";
import {
  formatDateTime,
  formatTimeRange,
  STUDENT_STATUS_LABEL,
  TEACHER_STATUS_LABEL,
  type OverviewExam,
  type OverviewSession,
  type OverviewWork,
  type Role,
  type StudentStatus,
  type TeacherStatus,
} from "@/src/lib/overview-api";

function Card({ children, onPress, label }: { children: React.ReactNode; onPress?: () => void; label: string }) {
  const theme = useTheme();
  const body = (
    <View style={[styles.card, elevation.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
      {children}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}>
      {body}
    </Pressable>
  );
}

function Pill({ text, tone }: { text: string; tone: "ok" | "warn" | "bad" | "neutral" }) {
  const theme = useTheme();
  const color = tone === "ok" ? palette.success : tone === "warn" ? palette.warning : tone === "bad" ? theme.colors.error : theme.colors.onSurfaceVariant;
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <Text style={[styles.pillText, { color }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

export function statusTone(status: OverviewWork["status"]): "ok" | "warn" | "bad" | "neutral" {
  switch (status) {
    case "graded":
    case "done":
      return "ok";
    case "submitted":
    case "open":
      return "neutral";
    case "todo":
      return "warn";
    case "overdue":
    case "needs_grading":
    case "closed":
      return "bad";
    default:
      return "neutral";
  }
}

export function statusLabel(role: Role, status: OverviewWork["status"]): string {
  return role === "student"
    ? STUDENT_STATUS_LABEL[status as StudentStatus] ?? status
    : TEACHER_STATUS_LABEL[status as TeacherStatus] ?? status;
}

export function WorkRow({ item, role, onPress }: { item: OverviewWork; role: Role; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Card onPress={onPress} label={`Mở bài tập ${item.title}`}>
      <View style={styles.rowTop}>
        <Text style={[typography.caption, styles.rowLabel, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
          {item.className}
        </Text>
        <Pill text={statusLabel(role, item.status)} tone={statusTone(item.status)} />
      </View>
      <Text style={typography.subtitle} numberOfLines={2}>{item.title}</Text>
      <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>Hạn nộp · {formatDateTime(item.dueAt)}</Text>
      {role === "student" && item.score !== null ? (
        <Text style={[typography.subtitle, { color: palette.success }]}>Điểm · {item.score}/10</Text>
      ) : null}
      {role === "teacher" ? (
        <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
          {item.submissionCount} bài nộp · {item.gradedCount} đã chấm
        </Text>
      ) : null}
    </Card>
  );
}

export function SessionRow({ session, dayLabel, onPress }: { session: OverviewSession; dayLabel?: string; onPress?: () => void }) {
  const theme = useTheme();
  return (
    <Card onPress={onPress} label={`Buổi học ${session.className}`}>
      <View style={styles.line}>
        <Ionicons name="time-outline" size={18} color={theme.colors.primary} />
        <Text style={typography.subtitle}>{formatTimeRange(session)}</Text>
        {dayLabel ? <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>· {dayLabel}</Text> : null}
      </View>
      <Text style={typography.body} numberOfLines={1}>{session.className}</Text>
      <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
        {session.room ? `Phòng ${session.room}` : "Chưa có phòng"}{session.note ? ` · ${session.note}` : ""}
      </Text>
    </Card>
  );
}

export function ExamRow({ exam, onPress }: { exam: OverviewExam; onPress?: () => void }) {
  const theme = useTheme();
  return (
    <Card onPress={onPress} label={`Kỳ kiểm tra ${exam.title}`}>
      <View style={styles.rowTop}>
        <Text style={[typography.caption, styles.rowLabel, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
          {exam.className}
        </Text>
        <Pill text="Kiểm tra" tone="bad" />
      </View>
      <Text style={typography.subtitle} numberOfLines={2}>{exam.title}</Text>
      <View style={styles.line}>
        <Ionicons name="calendar-outline" size={16} color={theme.colors.primary} />
        <Text style={typography.caption}>{formatDateTime(exam.startsAt)} · {exam.durationMinutes} phút</Text>
      </View>
      {exam.room || exam.note ? (
        <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
          {exam.room ? `Phòng ${exam.room}` : ""}{exam.room && exam.note ? " · " : ""}{exam.note}
        </Text>
      ) : null}
    </Card>
  );
}

export function Notice({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>["name"]; text: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.notice, { backgroundColor: theme.colors.primaryContainer }]}>
      <Ionicons name={icon} size={18} color={theme.colors.primary} />
      <Text style={[typography.caption, { flex: 1, color: theme.colors.onSurface }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs, padding: spacing.lg, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, marginBottom: spacing.md },
  rowTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 22 },
  rowLabel: { flex: 1, flexShrink: 1, minWidth: 0 },
  line: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  pill: { flexShrink: 0, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  pillText: { fontSize: 11, fontWeight: "700" },
  notice: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md },
});
