import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Linking, View } from "react-native";
import { Button, Divider, Text, TextInput } from "react-native-paper";
import { Screen } from "../../components/ui/Screen";
import { AppButton } from "../../components/ui/AppButton";
import { queryKeys } from "../../lib/query-client";
import { HttpError } from "../../lib/http";
import { getSubmission, listExercises, saveGrade, type Exercise, type GradeInput, type SubmissionDetail } from "./api";
import { safeSubmissionUrl, validateGrade, type GradeErrors } from "./validation";
import { useTeacherClass } from "./TeacherBoundary";
import { FailureNotice, FailureScreen, FieldError, formatDate, LoadingScreen, styles } from "./shared";
import { blocksScreen } from "./query-errors";

export default function GradeScreen() {
  const { token, userId, classId } = useTeacherClass();
  const params = useLocalSearchParams<{ exerciseId: string; submissionId: string }>();
  const exerciseId = typeof params.exerciseId === "string" ? params.exerciseId : "";
  const submissionId = typeof params.submissionId === "string" ? params.submissionId : "";
  const validIds = /^[a-f\d]{24}$/i.test(exerciseId) && /^[a-f\d]{24}$/i.test(submissionId);
  const exercises = useQuery({
    queryKey: queryKeys.exercises(userId, classId),
    queryFn: ({ signal }) => listExercises(token, classId, signal),
    enabled: validIds,
  });
  const detail = useQuery({
    queryKey: queryKeys.submission(userId, classId, exerciseId, submissionId),
    queryFn: ({ signal }) => getSubmission(token, classId, exerciseId, submissionId, signal),
    enabled: validIds,
  });
  if (!validIds) return <FailureScreen error={new HttpError("ID bài tập hoặc bài nộp không hợp lệ.", 400)} />;
  if (exercises.isError && blocksScreen(exercises.error, Boolean(exercises.data))) return <FailureScreen error={exercises.error} retry={() => void exercises.refetch()} />;
  // Keep an already-mounted form on transient refetch failure; permission errors must hide it.
  if (detail.isError && blocksScreen(detail.error, Boolean(detail.data))) {
    return <FailureScreen error={detail.error} retry={() => void detail.refetch()} />;
  }
  if (!exercises.data || !detail.data) return <LoadingScreen />;
  const exercise = exercises.data.find(item => item._id === exerciseId);
  if (!exercise) return <FailureScreen error={new HttpError("", 404)} />;
  return <GradeForm key={submissionId} exercise={exercise} detail={detail.data} />;
}

function GradeForm({ exercise, detail }: { exercise: Exercise; detail: SubmissionDetail }) {
  const { token, userId, classId } = useTeacherClass();
  const cache = useQueryClient();
  const { submission, grade } = detail;
  const [score, setScore] = useState(grade ? String(grade.score) : "");
  const [feedback, setFeedback] = useState(grade?.feedback ?? "");
  const [errors, setErrors] = useState<GradeErrors>({});
  const [saved, setSaved] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [now, setNow] = useState(Date.now());
  const saving = useRef(false);
  const dirty = useRef(false);
  const canGrade = now >= new Date(exercise.dueAt).getTime();
  const url = safeSubmissionUrl(submission.url);
  const mutation = useMutation({ mutationFn: (input: GradeInput) => saveGrade(token, classId, exercise._id, submission._id, input) });

  useEffect(() => {
    if (canGrade) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [canGrade]);

  useEffect(() => {
    if (dirty.current) return;
    setScore(grade ? String(grade.score) : "");
    setFeedback(grade?.feedback ?? "");
  }, [grade]);

  async function submit() {
    if (saving.current) return;
    const result = validateGrade(score, feedback);
    setErrors(result.errors);
    setSaved(false);
    if (!result.value) return;
    saving.current = true;
    try {
      const updated = await mutation.mutateAsync(result.value);
      dirty.current = false;
      cache.setQueryData(queryKeys.submission(userId, classId, exercise._id, submission._id), { submission, grade: updated });
      setScore(String(updated.score));
      setFeedback(updated.feedback);
      setSaved(true);
      // The detail key is nested under the list key, so this refreshes both.
      void cache.invalidateQueries({ queryKey: queryKeys.submissions(userId, classId, exercise._id) });
    } catch {
      // Keep the draft on network, validation, or deadline errors.
    } finally { saving.current = false; }
  }

  return <Screen><View style={styles.stack}>
    <Text variant="headlineSmall">{exercise.title}</Text>
    <Text selectable>Mã học sinh: {submission.studentId}</Text>
    <Text>Nộp lúc: {formatDate(submission.submittedAt)}</Text>
    <Text variant="titleMedium">Nội dung bài nộp</Text>
    <Text selectable>{submission.content || "Bài nộp chỉ có đường dẫn."}</Text>
    {url ? <Button mode="outlined" icon="open-in-new" onPress={() => {
      setLinkError("");
      void Linking.openURL(url).catch(() => setLinkError("Không mở được đường dẫn trên thiết bị này."));
    }}>Mở đường dẫn bài nộp</Button> : null}
    {submission.url ? <Text selectable>{submission.url}</Text> : null}
    <FieldError message={linkError} />
    <Divider />
    <Text variant="titleLarge">{grade ? "Cập nhật điểm" : "Chấm điểm"}</Text>
    <Text>Hạn nộp: {formatDate(exercise.dueAt)}</Text>
    {!canGrade ? <Text>Chưa đến hạn chấm điểm. Nút lưu sẽ mở khi đến hạn nộp.</Text> : null}
    <TextInput mode="outlined" label="Điểm (0–10)" accessibilityLabel="Điểm (0–10)" value={score} keyboardType="decimal-pad"
      onChangeText={value => { dirty.current = true; setSaved(false); setScore(value); }} error={Boolean(errors.score)} disabled={mutation.isPending} />
    <FieldError message={errors.score} />
    <TextInput mode="outlined" label="Phản hồi" accessibilityLabel="Phản hồi" value={feedback} multiline numberOfLines={4}
      onChangeText={value => { dirty.current = true; setSaved(false); setFeedback(value); }} error={Boolean(errors.feedback)} disabled={mutation.isPending} />
    <FieldError message={errors.feedback} />
    {mutation.isError ? <FailureNotice error={mutation.error} /> : null}
    {saved ? <Text accessibilityRole="alert">Đã lưu điểm và phản hồi.</Text> : null}
    <AppButton disabled={!canGrade} loading={mutation.isPending} onPress={() => void submit()}>Lưu điểm</AppButton>
  </View></Screen>;
}
