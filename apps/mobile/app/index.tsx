import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Text, useTheme } from "react-native-paper";
import { useAuth } from "@/src/lib/auth-context";
import { typography } from "@/src/theme/tokens";

export default function Index() {
  const theme = useTheme();
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <View style={[styles.wrap, { backgroundColor: theme.colors.background }]}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.inner}>
          <Text style={typography.display}>LMS Classroom</Text>
          <Text style={[typography.body, { color: theme.colors.onSurfaceVariant }]}>Đang khôi phục phiên…</Text>
          <ActivityIndicator color={theme.colors.primary} />
        </Animated.View>
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href={user.role === "teacher" ? "/(teacher)" : "/(student)"} />;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  inner: { alignItems: "center", gap: 12 },
});
