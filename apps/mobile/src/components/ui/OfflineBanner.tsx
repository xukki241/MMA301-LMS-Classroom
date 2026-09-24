import { View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useNetworkStatus } from "../../lib/network-context";
import { spacing } from "../../theme/tokens";

export function OfflineBanner() {
  const online = useNetworkStatus();
  const theme = useTheme();
  if (online !== false) return null;
  return <View accessibilityRole="alert" style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: theme.colors.errorContainer }}>
    <Text style={{ color: theme.colors.onErrorContainer, textAlign: "center" }}>
      Bạn đang ngoại tuyến. Một số dữ liệu có thể không được cập nhật.
    </Text>
  </View>;
}
