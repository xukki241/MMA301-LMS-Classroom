import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useNavigation } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Chip, Dialog, Portal, SegmentedButtons, Text, TextInput, useTheme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { AppButton } from "@/src/components/ui/AppButton";
import { ClassListSkeleton } from "@/src/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/src/components/ui/EmptyState";
import { FieldError, FormDialogScroll, FormNotice, useKeyboardLift } from "@/src/components/ui/FormFeedback";
import { DateTimeField } from "@/src/components/ui/DateTimeField";
import { TimePickerField } from "@/src/components/ui/TimePickerField";
import { SectionHeader } from "@/src/components/ui/Tile";
import { useAuth } from "@/src/lib/auth-context";
import { HttpError } from "@/src/lib/http";
import { userErrorMessage } from "@/src/lib/user-error-message";
import { queryClient, queryKeys } from "@/src/lib/query-client";
import { notifyError, notifySuccess } from "@/src/lib/haptics";
import { formatDateTime, sessionsByWeekday, WEEKDAY_LABELS } from "@/src/lib/overview-api";
import {
  createExam,
  createSession,
  deleteExam,
  deleteSession,
  listExams,
  listSessions,
  type ClassExamItem,
  type ClassSessionItem,
} from "@/src/lib/schedule-api";
import { elevation, radius, spacing, typography } from "@/src/theme/tokens";

type Tab = "study" | "exams";

function defaultExamStartIso() {
  const next = new Date(Date.now() + 24 * 60 * 60 * 1000);
  next.setMinutes(0, 0, 0);
  return next.toISOString();
}

function defaultExamEndIso(startIso: string) {
  return new Date(Date.parse(startIso) + 60 * 60 * 1000).toISOString();
}

function Item({ icon, title, lines, canDelete, onDelete }: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  lines: string[];
  canDelete: boolean;
  onDelete: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.item, elevation.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
      <Ionicons name={icon} size={20} color={theme.colors.primary} />
      <View style={styles.itemBody}>
        <Text style={typography.subtitle}>{title}</Text>
        {lines.filter(Boolean).map((line) => (
          <Text key={line} style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>{line}</Text>
        ))}
      </View>
      {canDelete ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Xóa ${title}`} hitSlop={12} onPress={onDelete} style={styles.delete}>
          <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
        </Pressable>
      ) : null}
    </View>
  );
}

export default function ClassScheduleScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { token, user } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const classId = Array.isArray(id) ? id[0] : id;
  const isTeacher = user?.role === "teacher";
  const userId = user?.id ?? "";
  const [tab, setTab] = useState<Tab>("study");

  const [sessionOpen, setSessionOpen] = useState(false);
  const [weekdays, setWeekdays] = useState<number[]>([1]);
  const [startTime, setStartTime] = useState("07:30");
  const [endTime, setEndTime] = useState("09:30");
  const [room, setRoom] = useState("");
  const [note, setNote] = useState("");

  const [examOpen, setExamOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [examStartAt, setExamStartAt] = useState(defaultExamStartIso);
  const [examEndAt, setExamEndAt] = useState(() => defaultExamEndIso(defaultExamStartIso()));
  const [formError, setFormError] = useState<string | null>(null);
  const [pulling, setPulling] = useState(false);
  const keyboardLift = useKeyboardLift();

  useEffect(() => {
    navigation.setOptions({ title: "Lịch của lớp" });
  }, [navigation]);

  const sessionsQuery = useQuery({
    queryKey: queryKeys.sessions(userId, classId ?? ""),
    enabled: Boolean(token && user && classId),
    queryFn: ({ signal }) => listSessions(token!, classId!, signal),
  });
  const examsQuery = useQuery({
    queryKey: queryKeys.exams(userId, classId ?? ""),
    enabled: Boolean(token && user && classId),
    queryFn: ({ signal }) => listExams(token!, classId!, signal),
  });

  const refetchSessions = sessionsQuery.refetch;
  const refetchExams = examsQuery.refetch;
  useFocusEffect(useCallback(() => {
    if (!token || !classId) return;
    void refetchSessions({ cancelRefetch: false });
    void refetchExams({ cancelRefetch: false });
  }, [token, classId, refetchSessions, refetchExams]));

  const onRefresh = async () => {
    setPulling(true);
    try {
      await Promise.all([
        refetchSessions({ cancelRefetch: false }),
        refetchExams({ cancelRefetch: false }),
      ]);
    } finally {
      setPulling(false);
    }
  };

  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.sessions(userId, classId!) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.exams(userId, classId!) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.overview(userId) });
  };

  const closeForms = () => {
    setSessionOpen(false);
    setExamOpen(false);
    setFormError(null);
    setRoom("");
    setNote("");
    setTitle("");
    const start = defaultExamStartIso();
    setExamStartAt(start);
    setExamEndAt(defaultExamEndIso(start));
  };

  const toggleWeekday = (day: number) => {
    setWeekdays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort((a, b) => a - b),
    );
  };

  const sessionMutation = useMutation({
    mutationFn: async () => {
      if (weekdays.length === 0) {
        throw new HttpError("Chọn ít nhất một ngày trong tuần.", 422, "VALIDATION_ERROR");
      }
      const created = [];
      for (const weekday of weekdays) {
        created.push(await createSession(token!, classId!, {
          weekday,
          startTime: startTime.trim(),
          endTime: endTime.trim(),
          room,
          note,
        }));
      }
      return created;
    },
    onSuccess: () => { notifySuccess(); refreshAll(); closeForms(); },
    onError: (error) => { notifyError(); setFormError(userErrorMessage(error)); },
  });

  const examMutation = useMutation({
    mutationFn: () => {
      const startMs = Date.parse(examStartAt);
      const endMs = Date.parse(examEndAt);
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
        throw new HttpError("Chọn ngày giờ bắt đầu và kết thúc trên lịch.", 422, "VALIDATION_ERROR");
      }
      if (endMs <= startMs) {
        throw new HttpError("Giờ kết thúc phải sau giờ bắt đầu.", 422, "VALIDATION_ERROR");
      }
      const durationMinutes = Math.round((endMs - startMs) / 60_000);
      if (durationMinutes < 1 || durationMinutes > 600) {
        throw new HttpError("Thời lượng kỳ kiểm tra từ 1 đến 600 phút.", 422, "VALIDATION_ERROR");
      }
      return createExam(token!, classId!, {
        title,
        startsAt: new Date(startMs).toISOString(),
        durationMinutes,
        room,
        note,
      });
    },
    onSuccess: () => { notifySuccess(); refreshAll(); closeForms(); },
    onError: (error) => { notifyError(); setFormError(userErrorMessage(error)); },
  });

  const removeMutation = useMutation({
    mutationFn: (target: { kind: Tab; id: string }) =>
      target.kind === "study" ? deleteSession(token!, classId!, target.id) : deleteExam(token!, classId!, target.id),
    onSuccess: () => { notifySuccess(); refreshAll(); },
    onError: (error) => { notifyError(); Alert.alert("Không thể xóa", userErrorMessage(error)); },
  });

  const confirmRemove = (kind: Tab, targetId: string, label: string) =>
    Alert.alert("Xóa mục này?", label, [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: () => removeMutation.mutate({ kind, id: targetId }) },
    ]);

  if (!classId) return <Screen><ErrorState message="Không tìm thấy lớp học." /></Screen>;

  const timeOrderError =
    startTime.trim() && endTime.trim() && endTime.trim() <= startTime.trim()
      ? "Giờ kết thúc phải sau giờ bắt đầu."
      : null;
  const examWindowError = (() => {
    const startMs = Date.parse(examStartAt);
    const endMs = Date.parse(examEndAt);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return "Chọn ngày giờ bắt đầu và kết thúc.";
    if (endMs <= startMs) return "Giờ kết thúc phải sau giờ bắt đầu.";
    const minutes = Math.round((endMs - startMs) / 60_000);
    if (minutes < 1 || minutes > 600) return "Thời lượng kỳ kiểm tra từ 1 đến 600 phút.";
    return null;
  })();
  const sessions: ClassSessionItem[] = sessionsQuery.data ?? [];
  const exams: ClassExamItem[] = (examsQuery.data ?? []).slice().sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const week = sessionsByWeekday(sessions.map((s) => ({ ...s, className: "" })));
  const active = tab === "study" ? sessionsQuery : examsQuery;

  return (
    <Screen
      bottomInset={spacing.xxxl}
      refreshControl={
        <RefreshControl refreshing={pulling} onRefresh={() => void onRefresh()} tintColor={theme.colors.primary} />
      }
    >
      <SegmentedButtons
        value={tab}
        onValueChange={(value) => setTab(value as Tab)}
        buttons={[
          { value: "study", label: "Lịch học", icon: "calendar" },
          { value: "exams", label: "Kiểm tra", icon: "file-document-outline" },
        ]}
        style={styles.segment}
      />

      {isTeacher ? (
        <AppButton style={styles.add} mode="contained-tonal" icon="plus" onPress={() => { setFormError(null); (tab === "study" ? setSessionOpen : setExamOpen)(true); }}>
          {tab === "study" ? "Thêm buổi học hằng tuần" : "Thêm kỳ kiểm tra"}
        </AppButton>
      ) : null}

      {active.isPending ? <ClassListSkeleton /> : null}
      {active.isError ? <ErrorState message={userErrorMessage(active.error)} onRetry={() => void active.refetch({ cancelRefetch: false })} /> : null}

      {tab === "study" && sessionsQuery.isSuccess ? (
        sessions.length === 0 ? (
          <EmptyState icon="calendar-outline" title="Lớp chưa có lịch học" subtitle={isTeacher ? "Thêm buổi học hằng tuần ở nút phía trên." : "Giáo viên chưa thêm lịch học."} />
        ) : (
          week.filter((day) => day.items.length > 0).map((day) => (
            <View key={day.weekday}>
              <SectionHeader title={WEEKDAY_LABELS[day.weekday]} />
              {day.items.map((s) => (
                <Item
                  key={s.id}
                  icon="time-outline"
                  title={`${s.startTime} – ${s.endTime}`}
                  lines={[s.room ? `Phòng ${s.room}` : "", s.note]}
                  canDelete={isTeacher}
                  onDelete={() => confirmRemove("study", s.id, `${WEEKDAY_LABELS[s.weekday]} ${s.startTime}`)}
                />
              ))}
            </View>
          ))
        )
      ) : null}

      {tab === "exams" && examsQuery.isSuccess ? (
        exams.length === 0 ? (
          <EmptyState icon="document-text-outline" title="Lớp chưa có kỳ kiểm tra" subtitle={isTeacher ? "Thêm kỳ kiểm tra ở nút phía trên." : "Giáo viên chưa lên lịch kiểm tra."} />
        ) : (
          exams.map((exam) => (
            <Item
              key={exam.id}
              icon="document-text-outline"
              title={exam.title}
              lines={[`${formatDateTime(exam.startsAt)} · ${exam.durationMinutes} phút`, exam.room ? `Phòng ${exam.room}` : "", exam.note]}
              canDelete={isTeacher}
              onDelete={() => confirmRemove("exams", exam.id, exam.title)}
            />
          ))
        )
      ) : null}

      <Portal>
        <Dialog visible={sessionOpen} onDismiss={closeForms} style={{ marginBottom: keyboardLift }}>
          <Dialog.Title>Thêm buổi học</Dialog.Title>
          {formError ? <View style={styles.notice}><FormNotice message={formError} /></View> : null}
          <FormDialogScroll>
            <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>Chọn một hoặc nhiều ngày trong tuần</Text>
            <View style={styles.chips}>
              {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                const selected = weekdays.includes(day);
                return (
                  <Chip
                    key={day}
                    selected={selected}
                    showSelectedCheck={false}
                    compact
                    onPress={() => toggleWeekday(day)}
                    style={selected ? { backgroundColor: theme.colors.primary } : undefined}
                    textStyle={selected ? { color: theme.colors.onPrimary } : undefined}
                  >
                    {WEEKDAY_LABELS[day]}
                  </Chip>
                );
              })}
            </View>
            <TimePickerField label="Bắt đầu" value={startTime} onChange={setStartTime} />
            <TimePickerField label="Kết thúc" value={endTime} onChange={setEndTime} />
            <FieldError message={timeOrderError} />
            <TextInput mode="outlined" label="Phòng (tuỳ chọn)" value={room} onChangeText={setRoom} />
            <TextInput mode="outlined" label="Ghi chú (tuỳ chọn)" value={note} onChangeText={setNote} />
          </FormDialogScroll>
          <Dialog.Actions>
            <AppButton mode="text" onPress={closeForms}>Hủy</AppButton>
            <AppButton
              style={styles.save}
              loading={sessionMutation.isPending}
              disabled={Boolean(timeOrderError) || sessionMutation.isPending}
              onPress={() => {
                if (timeOrderError) {
                  notifyError();
                  setFormError(timeOrderError);
                  return;
                }
                setFormError(null);
                sessionMutation.mutate();
              }}
            >
              Lưu
            </AppButton>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={examOpen} onDismiss={closeForms} style={{ marginBottom: keyboardLift }}>
          <Dialog.Title>Thêm kỳ kiểm tra</Dialog.Title>
          {formError ? <View style={styles.notice}><FormNotice message={formError} /></View> : null}
          <FormDialogScroll>
            <TextInput mode="outlined" label="Tiêu đề" value={title} onChangeText={setTitle} />
            <DateTimeField
              label="Bắt đầu"
              value={examStartAt}
              minimumDate={new Date()}
              onChange={(next) => {
                setExamStartAt(next);
                if (Date.parse(examEndAt) <= Date.parse(next)) {
                  setExamEndAt(defaultExamEndIso(next));
                }
                setFormError(null);
              }}
            />
            <DateTimeField
              label="Kết thúc"
              value={examEndAt}
              minimumDate={new Date(examStartAt)}
              onChange={(next) => {
                setExamEndAt(next);
                setFormError(null);
              }}
            />
            <FieldError message={examWindowError} />
            <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
              Thời lượng sẽ tính từ khoảng bắt đầu → kết thúc.
            </Text>
            <TextInput mode="outlined" label="Phòng (tuỳ chọn)" value={room} onChangeText={setRoom} />
            <TextInput mode="outlined" label="Ghi chú (tuỳ chọn)" value={note} onChangeText={setNote} />
          </FormDialogScroll>
          <Dialog.Actions>
            <AppButton mode="text" onPress={closeForms}>Hủy</AppButton>
            <AppButton
              style={styles.save}
              loading={examMutation.isPending}
              disabled={Boolean(examWindowError) || examMutation.isPending}
              onPress={() => {
                if (examWindowError) {
                  notifyError();
                  setFormError(examWindowError);
                  return;
                }
                setFormError(null);
                examMutation.mutate();
              }}
            >
              Lưu
            </AppButton>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: { marginBottom: spacing.md },
  notice: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  save: { minWidth: 96 },
  add: { marginBottom: spacing.md },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingBottom: spacing.sm },
  item: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, marginBottom: spacing.md },
  itemBody: { flex: 1, gap: 2 },
  delete: { padding: spacing.xs, minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
});
