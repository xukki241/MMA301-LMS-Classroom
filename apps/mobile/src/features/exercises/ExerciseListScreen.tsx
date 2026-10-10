import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { RefreshControl, View } from "react-native";
import { Card, Text } from "react-native-paper";
import { Screen } from "../../components/ui/Screen";
import { AppButton } from "../../components/ui/AppButton";
import { EmptyState } from "../../components/ui/EmptyState";
import { queryKeys } from "../../lib/query-client";
import { listExercises } from "./api";
import { useTeacherClass } from "./TeacherBoundary";
import { exercisePath, FailureScreen, formatDate, LoadingScreen, styles } from "./shared";

export default function ExerciseListScreen() {
  const { token, userId, classId, className } = useTeacherClass();
  const query = useQuery({
    queryKey: queryKeys.exercises(userId, classId),
    queryFn: ({ signal }) => listExercises(token, classId, signal),
  });
  if (query.isPending) return <LoadingScreen />;
  if (query.isError) return <FailureScreen error={query.error} retry={() => void query.refetch()} />;

  return <Screen refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />}>
    <View style={styles.stack}>
      <Text variant="titleLarge">{className}</Text>
      <AppButton icon="plus" onPress={() => router.push(`${exercisePath(classId)}/new`)}>Tạo bài tập</AppButton>
      {query.data.length === 0 ? <EmptyState title="Chưa có bài tập" subtitle="Tạo bài tập đầu tiên cho lớp của bạn." /> : null}
      {query.data.map(exercise => <Card key={exercise._id} mode="outlined" accessibilityRole="button"
        accessibilityLabel={`Mở bài tập ${exercise.title}`} onPress={() => router.push(`${exercisePath(classId)}/${exercise._id}`)}>
        <View style={styles.card}>
          <Text variant="titleMedium">{exercise.title}</Text>
          <Text>Hạn nộp: {formatDate(exercise.dueAt)}</Text>
          {exercise.description ? <Text numberOfLines={2} style={styles.muted}>{exercise.description}</Text> : null}
          <Text>Xem bài nộp →</Text>
        </View>
      </Card>)}
    </View>
  </Screen>;
}
