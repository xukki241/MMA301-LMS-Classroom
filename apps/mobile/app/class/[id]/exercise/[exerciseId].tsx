import { useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Text, TextInput, useTheme } from "react-native-paper";
import { Screen } from "@/src/components/ui/Screen";
import { ClassListSkeleton } from "@/src/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/src/components/ui/EmptyState";
import { AppButton } from "@/src/components/ui/AppButton";
import { CloudinaryFilePicker } from "@/src/components/ui/CloudinaryFilePicker";
import { ClassFilesPanel } from "@/src/components/files/ClassFilesPanel";
import { FieldError, keyboardBehavior } from "@/src/components/ui/FormFeedback";
import { useAuth } from "@/src/lib/auth-context";
import { userErrorMessage } from "@/src/lib/user-error-message";
import {
  createSubmission,
  getMySubmission,
  isExerciseOpen,
  listExercises,
  listSubmissions,
  putGrade,
  updateMySubmission,
  validateGradeScore,
  validateSubmissionPayload,
} from "@/src/lib/exercises-api";
import { queryClient, queryKeys } from "@/src/lib/query-client";
import { notifyError, notifySuccess } from "@/src/lib/haptics";
import { palette, radius, spacing, typography } from "@/src/theme/tokens";

export default function ExerciseDetailScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { token, user } = useAuth();
  const params = useLocalSearchParams<{ id?: string; exerciseId?: string; title?: string }>();
  const classId = Array.isArray(params.id) ? params.id[0] : params.id;
  const exerciseId = Array.isArray(params.exerciseId) ? params.exerciseId[0] : params.exerciseId;
  const titleParam = Array.isArray(params.title) ? params.title[0] : params.title;

  const isTeacher = user?.role === "teacher";
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [gradeScore, setGradeScore] = useState("");
  const [gradeFeedback, setGradeFeedback] = useState("");
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradeError, setGradeError] = useState<string | null>(null);

  const exercisesQuery = useQuery({
    queryKey: queryKeys.exercises(user?.id ?? "", classId ?? ""),
    enabled: Boolean(token && user && classId),
    queryFn: ({ signal }) => listExercises(token!, classId!, signal),
  });

  const exercise = exercisesQuery.data?.find((item) => item.id === exerciseId);

  const mineQuery = useQuery({
    queryKey: queryKeys.mySubmission(user?.id ?? "", classId ?? "", exerciseId ?? ""),
    enabled: Boolean(token && user && classId && exerciseId && !isTeacher),
    queryFn: () => getMySubmission(token!, classId!, exerciseId!),
  });

  const teacherSubsQuery = useQuery({
    queryKey: queryKeys.exerciseSubmissions(user?.id ?? "", classId ?? "", exerciseId ?? ""),
    enabled: Boolean(token && user && classId && exerciseId && isTeacher),
    queryFn: ({ signal }) => listSubmissions(token!, classId!, exerciseId!, signal),
  });

  useEffect(() => {
    navigation.setOptions({ title: titleParam ?? exercise?.title ?? "Bài tập" });
  }, [navigation, titleParam, exercise?.title]);

  useEffect(() => {
    if (mineQuery.data?.submission) {
      setContent(mineQuery.data.submission.content);
      setUrl(mineQuery.data.submission.url);
    }
  }, [mineQuery.data?.submission?.id]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = validateSubmissionPayload(content, url);
      if (mineQuery.data?.submission) {
        return updateMySubmission(token!, classId!, exerciseId!, payload);
      }
      return createSubmission(token!, classId!, exerciseId!, payload);
    },
    onSuccess: () => {
      notifySuccess();
      void queryClient.invalidateQueries({
        queryKey: queryKeys.mySubmission(user!.id, classId!, exerciseId!),
      });
      setSubmitError(null);
    },
    onError: (err: unknown) => {
      notifyError();
      setSubmitError(userErrorMessage(err));
    },
  });

  const gradeMutation = useMutation({
    mutationFn: ({ submissionId, score, feedback }: { submissionId: string; score: number; feedback: string }) =>
      putGrade(token!, classId!, exerciseId!, submissionId, { score, feedback }),
    onSuccess: () => {
      notifySuccess();
      setGradingId(null);
      setGradeScore("");
      setGradeFeedback("");
      setGradeError(null);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.exerciseSubmissions(user!.id, classId!, exerciseId!),
      });
    },
    onError: (err: unknown) => {
      notifyError();
      setGradeError(userErrorMessage(err));
    },
  });

  if (!classId || !exerciseId) {
    return (
      <Screen>
        <ErrorState message="Thiếu thông tin bài tập." />
      </Screen>
    );
  }

  if (exercisesQuery.isPending) {
    return (
      <Screen>
        <ClassListSkeleton accessibilityLabel="Đang tải bài tập" />
      </Screen>
    );
  }

  if (exercisesQuery.isError) {
    return (
      <Screen>
        <ErrorState message={userErrorMessage(exercisesQuery.error)} onRetry={() => void exercisesQuery.refetch()} />
      </Screen>
    );
  }

  if (!exercise) {
    return (
      <Screen>
        <EmptyState
          title="Không tìm thấy bài tập"
          subtitle="Bài tập không còn trong danh sách của lớp."
          icon="create-outline"
          actionLabel="Thử lại"
          onAction={() => void exercisesQuery.refetch()}
        />
      </Screen>
    );
  }

  const open = isExerciseOpen(exercise.dueAt);
  const graded = Boolean(mineQuery.data?.grade);
  const canResubmit = !isTeacher && !graded && open;
  const dueLabel = new Date(exercise.dueAt).toLocaleString("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={keyboardBehavior} keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}>
      <Screen
        keyboardInset
        refreshControl={
          <RefreshControl
            refreshing={exercisesQuery.isRefetching || mineQuery.isRefetching || teacherSubsQuery.isRefetching}
            onRefresh={() => {
              void exercisesQuery.refetch();
              if (isTeacher) void teacherSubsQuery.refetch();
              else void mineQuery.refetch();
            }}
          />
        }
      >
        <View style={styles.scroll}>
          <View style={[styles.hero, { borderColor: theme.colors.outline }]}>
            <Text style={typography.title}>{exercise.title}</Text>
            {exercise.description ? (
              <Text style={[typography.body, { color: theme.colors.onSurfaceVariant }]}>{exercise.description}</Text>
            ) : null}
            {exercise.attachmentUrl ? (
              <Pressable onPress={() => void Linking.openURL(exercise.attachmentUrl)}>
                <Text style={[typography.caption, { color: theme.colors.primary }]}>Tệp đính kèm của GV · mở</Text>
              </Pressable>
            ) : null}
            <Text style={typography.caption}>Hạn nộp · {dueLabel}</Text>
            <Text style={[typography.caption, { color: open ? palette.success : theme.colors.error }]}>
              {open ? "Đang nhận bài" : "Đã hết hạn nộp"}
            </Text>
          </View>

          {!isTeacher ? (
            <View style={styles.block}>
              <Text style={typography.subtitle}>Bài làm của bạn</Text>
              {mineQuery.isPending ? (
                <ClassListSkeleton accessibilityLabel="Đang tải bài làm" />
              ) : mineQuery.isError ? (
                <ErrorState message={userErrorMessage(mineQuery.error)} onRetry={() => void mineQuery.refetch()} />
              ) : (
                <>
                  {mineQuery.data?.grade ? (
                    <View style={[styles.gradeBox, { backgroundColor: theme.colors.primaryContainer }]}>
                      <Text style={typography.subtitle}>Điểm · {mineQuery.data.grade.score}/10</Text>
                      {mineQuery.data.grade.feedback ? (
                        <Text style={typography.body}>{mineQuery.data.grade.feedback}</Text>
                      ) : null}
                      <Text style={typography.caption}>Đã chấm — không nộp lại được.</Text>
                    </View>
                  ) : null}
                  {canResubmit ? (
                    <>
                      <TextInput
                        mode="outlined"
                        label="Nội dung bài làm"
                        multiline
                        value={content}
                        onChangeText={setContent}
                        error={Boolean(submitError)}
                        blurOnSubmit={false}
                      />
                      <TextInput
                        mode="outlined"
                        label="Link bài làm (http/https) *"
                        autoCapitalize="none"
                        keyboardType="url"
                        value={url}
                        onChangeText={setUrl}
                      />
                      <CloudinaryFilePicker
                        label="Hoặc upload file bài làm *"
                        value={url}
                        onChange={setUrl}
                        token={token}
                        classId={classId}
                        purpose="submission"
                      />
                      <FieldError message={submitError} />
                      <AppButton
                        testID="submit-exercise"
                        loading={submitMutation.isPending}
                        onPress={() => submitMutation.mutate()}
                      >
                        {mineQuery.data?.submission ? "Cập nhật bài nộp" : "Nộp bài"}
                      </AppButton>
                      <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
                        {mineQuery.data?.submission
                          ? "Có thể cập nhật khi bài còn mở và chưa được chấm."
                          : "Bắt buộc link http(s) hoặc file đã upload."}
                      </Text>
                    </>
                  ) : mineQuery.data?.submission && !mineQuery.data.grade ? (
                    <Text style={typography.body}>Đã nộp · chờ giáo viên chấm điểm.</Text>
                  ) : mineQuery.data?.submission ? null : (
                    <EmptyState title="Bạn chưa nộp bài" subtitle="Hạn nộp đã qua." icon="create-outline" />
                  )}
                  <ClassFilesPanel classId={classId} canDelete={false} />
                </>
              )}
            </View>
          ) : (
            <View style={styles.block}>
              <Text style={typography.subtitle}>Bài nộp của học sinh</Text>
              <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
                {open ? "Chấm điểm được bật sau hạn nộp." : "Có thể chấm điểm sau khi hết hạn nộp."}
              </Text>
              {teacherSubsQuery.isPending ? (
                <ClassListSkeleton accessibilityLabel="Đang tải bài nộp" />
              ) : teacherSubsQuery.isError ? (
                <ErrorState message={userErrorMessage(teacherSubsQuery.error)} onRetry={() => void teacherSubsQuery.refetch()} />
              ) : (teacherSubsQuery.data ?? []).length === 0 ? (
                <EmptyState title="Chưa có bài nộp" icon="people-outline" />
              ) : (
                teacherSubsQuery.data?.map((row) => (
                  <View key={row.id} style={[styles.subRow, { borderColor: theme.colors.outline }]}>
                    <Text style={typography.body}>{row.studentDisplayName || "Học sinh"}</Text>
                    <Text style={typography.caption}>{row.content || "—"}</Text>
                    {row.url ? (
                      <Pressable onPress={() => void Linking.openURL(row.url)}>
                        <Text style={[typography.caption, { color: theme.colors.primary }]}>Mở file đính kèm</Text>
                      </Pressable>
                    ) : null}
                    {row.grade ? (
                      <View style={styles.gradedRow}>
                        <Text style={[typography.subtitle, { color: palette.success }]}>
                          Đã chấm · {row.grade.score}/10
                        </Text>
                        {typeof row.grade.feedback === "string" && row.grade.feedback.trim().length > 0 ? (
                          <Text style={typography.body}>{row.grade.feedback.trim()}</Text>
                        ) : null}
                      </View>
                    ) : gradingId === row.id ? (
                      <View style={styles.gradeForm}>
                        <TextInput
                          mode="outlined"
                          label="Điểm (0–10)"
                          keyboardType="decimal-pad"
                          value={gradeScore}
                          onChangeText={(value) => {
                            const next = value.replace(",", ".").replace(/[^\d.]/g, "");
                            const parts = next.split(".");
                            const cleaned = parts.length <= 1 ? parts[0] : `${parts[0]}.${parts[1].slice(0, 2)}`;
                            if (cleaned === "") {
                              setGradeScore("");
                              setGradeError(null);
                              return;
                            }
                            const score = Number(cleaned);
                            if (!Number.isFinite(score) || score > 10) {
                              setGradeError("Điểm chỉ từ 0 đến 10.");
                              setGradeScore(score > 10 ? "10" : cleaned);
                              return;
                            }
                            setGradeError(null);
                            setGradeScore(cleaned);
                          }}
                          error={Boolean(gradeError)}
                          autoFocus
                          blurOnSubmit={false}
                        />
                        <FieldError message={gradeError} />
                        <TextInput
                          mode="outlined"
                          label="Nhận xét"
                          value={gradeFeedback}
                          onChangeText={setGradeFeedback}
                          blurOnSubmit={false}
                        />
                        <View style={styles.gradeActions}>
                          <AppButton mode="text" onPress={() => setGradingId(null)}>
                            Hủy
                          </AppButton>
                          <AppButton
                            loading={gradeMutation.isPending}
                            onPress={() => {
                              try {
                                const score = validateGradeScore(gradeScore);
                                setGradeError(null);
                                gradeMutation.mutate({ submissionId: row.id, score, feedback: gradeFeedback });
                              } catch (err) {
                                setGradeError(err instanceof Error ? err.message : "Điểm không hợp lệ");
                                notifyError();
                              }
                            }}
                          >
                            Lưu điểm
                          </AppButton>
                        </View>
                      </View>
                    ) : (
                      <AppButton
                        mode="outlined"
                        disabled={open}
                        onPress={() => {
                          setGradingId(row.id);
                          setGradeScore(row.grade ? String(row.grade.score) : "");
                          setGradeFeedback(row.grade?.feedback ?? "");
                          setGradeError(null);
                        }}
                      >
                        {open ? "Chờ hết hạn" : "Chấm điểm"}
                      </AppButton>
                    )}
                  </View>
                ))
              )}
              <ClassFilesPanel classId={classId} canDelete />
            </View>
          )}
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingBottom: spacing.xxl, gap: spacing.lg },
  hero: { gap: spacing.sm, paddingBottom: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth },
  block: { gap: spacing.md },
  gradeBox: { padding: spacing.md, borderRadius: radius.md, gap: spacing.xs },
  gradedRow: { gap: spacing.xs },
  subRow: { gap: spacing.xs, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  gradeForm: { gap: spacing.sm, marginTop: spacing.sm },
  gradeActions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm },
});
