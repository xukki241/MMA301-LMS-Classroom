import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { radius } from "@/src/theme/tokens";

type Props = {
  label: string;
  uri?: string | null;
  size?: number;
};

export function CachedAvatar({ label, uri, size = 44 }: Props) {
  const theme = useTheme();
  const initial = label.trim().charAt(0).toUpperCase() || "?";

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: radius.md }}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={200}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: radius.md,
          backgroundColor: theme.colors.primaryContainer,
        },
      ]}
    >
      <Text style={{ color: theme.colors.primary, fontWeight: "800" }}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: "center", justifyContent: "center" },
});
