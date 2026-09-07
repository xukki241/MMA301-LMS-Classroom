import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Divider, Text, useTheme } from "react-native-paper";
import { Screen } from "@/src/components/ui/Screen";
import { AppButton } from "@/src/components/ui/AppButton";
import { CachedAvatar } from "@/src/components/ui/CachedAvatar";
import { useAuth } from "@/src/lib/auth-context";
import { useMeQuery } from "@/src/lib/hooks";
import { AUTH_URL, CORE_URL } from "@/src/lib/config";
import { notifySuccess } from "@/src/lib/haptics";
import { spacing, typography } from "@/src/theme/tokens";

export function ProfileScreen() {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const meQuery = useMeQuery();

  return (
    <Screen>
      <Animated.View entering={FadeInDown.springify()} style={styles.hero}>
        <CachedAvatar label={user?.displayName ?? "U"} size={72} />
        <Text style={typography.title}>{user?.displayName}</Text>
        <Text style={[typography.body, { color: theme.colors.onSurfaceVariant }]}>{user?.email}</Text>
        <Text style={typography.caption}>
          {user?.role === "teacher" ? "Vai trò giáo viên" : "Vai trò học sinh"}
        </Text>
      </Animated.View>

      <View style={styles.block}>
        <Text style={typography.label}>PHIÊN LÀM VIỆC</Text>
        <Text style={typography.body}>
          {meQuery.isPending
            ? "Đang xác thực /me…"
            : meQuery.isError
              ? meQuery.error.message
              : `Core xác nhận: ${meQuery.data?.user.email ?? user?.email}`}
        </Text>
        <Divider style={styles.divider} />
        <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>Auth · {AUTH_URL}</Text>
        <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>Core · {CORE_URL}</Text>
      </View>

      <AppButton
        mode="contained-tonal"
        onPress={() => {
          notifySuccess();
          void logout();
        }}
      >
        Đăng xuất
      </AppButton>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xxl },
  block: { gap: spacing.sm, marginBottom: spacing.xxl },
  divider: { marginVertical: spacing.sm },
});
