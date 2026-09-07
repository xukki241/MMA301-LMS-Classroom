import { Link, Stack } from "expo-router";
import { StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { Screen } from "@/src/components/ui/Screen";
import { typography } from "@/src/theme/tokens";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Không tìm thấy" }} />
      <Screen>
        <Text style={typography.title}>Màn hình này không tồn tại.</Text>
        <Link href="/" style={styles.link}>
          <Text>Về trang chủ</Text>
        </Link>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  link: { marginTop: 16 },
});
