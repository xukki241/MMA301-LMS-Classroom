import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";
import { RoleTabs } from "@/src/components/navigation/RoleTabs";
import { useAuth } from "@/src/lib/auth-context";

export default function StudentLayout() {
  const theme = useTheme();
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (user.role !== "student") {
    return <Redirect href="/(teacher)" />;
  }

  return <RoleTabs />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
});
