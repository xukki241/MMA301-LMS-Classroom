import { type ReactElement, type ReactNode } from "react";
import { ScrollView, StyleSheet, View, type RefreshControlProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "react-native-paper";
import { spacing } from "@/src/theme/tokens";

type Props = {
  children: ReactNode;
  scroll?: boolean;
  refreshControl?: ReactElement<RefreshControlProps>;
  padded?: boolean;
};

export function Screen({ children, scroll = true, refreshControl, padded = true }: Props) {
  const theme = useTheme();
  const body = (
    <View style={[styles.body, padded && styles.padded, { backgroundColor: theme.colors.background }]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={["top", "left", "right"]}>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          refreshControl={refreshControl}
        >
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1 },
  body: { flexGrow: 1 },
  padded: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
});
