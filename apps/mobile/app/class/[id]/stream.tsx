import { Stack, useLocalSearchParams } from "expo-router";
import ClassStreamScreen from "../../../src/screens/ClassStreamScreen";

export default function StreamRoute() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const classId = Array.isArray(id) ? id[0] : id;
  return <>
    <Stack.Screen options={{ headerShown: true, title: "Bảng tin", animation: "slide_from_right" }} />
    <ClassStreamScreen classId={classId ?? ""} />
  </>;
}
