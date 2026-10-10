import { useRef, useState } from "react";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { View } from "react-native";
import { Text, TextInput } from "react-native-paper";
import { Screen } from "../../components/ui/Screen";
import { AppButton } from "../../components/ui/AppButton";
import { queryKeys } from "../../lib/query-client";
import { createExercise } from "./api";
import { validateExercise, type ExerciseErrors } from "./validation";
import { useTeacherClass } from "./TeacherBoundary";
import { exercisePath, FailureNotice, FieldError, styles } from "./shared";

export default function CreateExerciseScreen() {
  const { token, userId, classId } = useTeacherClass();
  const cache = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [errors, setErrors] = useState<ExerciseErrors>({});
  const saving = useRef(false);
  const mutation = useMutation({ mutationFn: (input: Parameters<typeof createExercise>[2]) => createExercise(token, classId, input) });

  async function submit() {
    if (saving.current) return;
    const result = validateExercise({ title, description, date, time });
    setErrors(result.errors);
    if (!result.value) return;
    saving.current = true;
    try {
      await mutation.mutateAsync(result.value);
      await cache.invalidateQueries({ queryKey: queryKeys.exercises(userId, classId) });
      router.replace(exercisePath(classId));
    } catch {
      // Keep all fields so a failed request never erases the teacher's work.
    } finally { saving.current = false; }
  }

  return <Screen><View style={styles.stack}>
    <Text variant="headlineSmall">Tạo bài tập</Text>
    <TextInput mode="outlined" label="Tiêu đề" accessibilityLabel="Tiêu đề" value={title} onChangeText={setTitle} error={Boolean(errors.title)} disabled={mutation.isPending} />
    <FieldError message={errors.title} />
    <TextInput mode="outlined" label="Mô tả" accessibilityLabel="Mô tả" value={description} onChangeText={setDescription} multiline numberOfLines={4} error={Boolean(errors.description)} disabled={mutation.isPending} />
    <FieldError message={errors.description} />
    <Text variant="titleMedium">Hạn nộp</Text>
    <Text style={styles.muted}>Giờ trên thiết bị: {Intl.DateTimeFormat().resolvedOptions().timeZone}</Text>
    <TextInput mode="outlined" label="Ngày (YYYY-MM-DD)" accessibilityLabel="Ngày (YYYY-MM-DD)" placeholder="2030-12-31" value={date} onChangeText={setDate} autoCapitalize="none" error={Boolean(errors.deadline)} disabled={mutation.isPending} />
    <TextInput mode="outlined" label="Giờ (HH:mm)" accessibilityLabel="Giờ (HH:mm)" placeholder="23:59" value={time} onChangeText={setTime} autoCapitalize="none" error={Boolean(errors.deadline)} disabled={mutation.isPending} />
    <FieldError message={errors.deadline} />
    {mutation.isError ? <View><FailureNotice error={mutation.error} /><Text>Thông tin đã được giữ lại. Nếu kết nối bị ngắt khi lưu, hãy kiểm tra danh sách trước khi tạo lại.</Text></View> : null}
    <AppButton loading={mutation.isPending} onPress={() => void submit()}>Tạo bài tập</AppButton>
  </View></Screen>;
}
