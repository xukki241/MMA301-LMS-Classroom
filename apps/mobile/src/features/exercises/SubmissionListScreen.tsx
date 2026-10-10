import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { RefreshControl, View } from "react-native";
import { Card, Text } from "react-native-paper";
import { Screen } from "../../components/ui/Screen";
import { EmptyState } from "../../components/ui/EmptyState";
import { queryKeys } from "../../lib/query-client";
import { HttpError } from "../../lib/http";
import { listExercises, listSubmissions } from "./api";
import { useTeacherClass } from "./TeacherBoundary";
import { exercisePath, FailureScreen, formatDate, LoadingScreen, styles } from "./shared";

export default function SubmissionListScreen() {
  const { token, userId, classId } = useTeacherClass();
  const params = useLocalSearchParams<{ exerciseId: string }>();
  const exerciseId = typeof params.exerciseId === "string" ? params.exerciseId : "";
  const validId = /^[a-f\d]{24}$/i.test(exerciseId);
  const exercises = useQuery({
    queryKey: queryKeys.exercises(userId, classId),
    queryFn: ({ signal }) => listExercises(token, classId, signal),
    enabled: validId,
  });
  const submissions = useQuery({
    queryKey: queryKeys.submissions(userId, classId, exerciseId),
    queryFn: ({ signal }) => listSubmissions(token, classId, exerciseId, signal),
    enabled: validId,
  });
  if (!validId) return <FailureScreen error={new HttpError("ID bài tập không hợp lệ.", 400)} />;
  if (exercises.isError) return <FailureScreen error={exercises.error} retry={() => void exercises.refetch()} />;
  if (submissions.isError) return <FailureScreen error={submissions.error} retry={() => void submissions.refetch()} />;
  if (exercises.isPending || submissions.isPending) return <LoadingScreen />;
  const exercise = exercises.data.find(item => item._id === exerciseId);
  if (!exercise) return <FailureScreen error={new HttpError("", 404)} />;

  return <Screen refreshControl={<RefreshControl refreshing={submissions.isRefetching || exercises.isRefetching}
    onRefresh={() => { void exercises.refetch(); void submissions.refetch(); }} />}>
    <View style={styles.stack}>
      <Text variant="headlineSmall">{exercise.title}</Text>
      <Text>Hạn nộp: {formatDate(exercise.dueAt)}</Text>
      {exercise.description ? <Text selectable>{exercise.description}</Text> : null}
      <Text variant="titleMedium">Bài nộp ({submissions.data.length})</Text>
      <Text style={styles.muted}>Có thể chấm điểm sau hạn nộp.</Text>
      {submissions.data.length === 0 ? <EmptyState title="Chưa có bài nộp" subtitle="Các bài đã nộp sẽ xuất hiện ở đây." /> : null}
      {submissions.data.map(submission => <Card key={submission._id} mode="outlined" accessibilityRole="button"
        accessibilityLabel={`Xem bài của ${submission.studentId}`}
        onPress={() => router.push(`${exercisePath(classId)}/${exerciseId}/${submission._id}`)}>
        <View style={styles.card}>
          <Text variant="titleSmall" selectable>Mã học sinh: {submission.studentId}</Text>
          <Text>Nộp lúc: {formatDate(submission.submittedAt)}</Text>
          <Text>{submission.grade ? `Đã chấm: ${submission.grade.score}/10` : "Chưa chấm"}</Text>
          <Text>Xem và chấm bài →</Text>
        </View>
      </Card>)}
    </View>
  </Screen>;
}
