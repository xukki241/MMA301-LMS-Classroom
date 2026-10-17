import { Stack, router } from "expo-router";
import { IconButton } from "react-native-paper";
import { TeacherBoundary, useTeacherClass } from "@/src/features/exercises/TeacherBoundary";

function TeacherStack() {
  const { classId, userId } = useTeacherClass();
  return <Stack key={`${userId}:${classId}`} screenOptions={{
    headerShown: true,
    headerLeft: () => <IconButton icon="arrow-left" accessibilityLabel="Quay lại" onPress={() => {
      if (router.canGoBack()) router.back();
      else router.replace({ pathname: "/class/[id]", params: { id: classId } });
    }} />,
  }}>
    <Stack.Screen name="index" options={{ title: "Bài tập" }} />
    <Stack.Screen name="new" options={{ title: "Tạo bài tập" }} />
    <Stack.Screen name="[exerciseId]/index" options={{ title: "Bài nộp" }} />
    <Stack.Screen name="[exerciseId]/[submissionId]" options={{ title: "Chấm bài" }} />
  </Stack>;
}

export default function Layout() {
  return <TeacherBoundary><TeacherStack /></TeacherBoundary>;
}
