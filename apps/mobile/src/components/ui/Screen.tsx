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
  /** Extra space so the last field or error clears a floating action or the keyboard. */
  bottomInset?: number;
  keyboardInset?: boolean;
};

export function Screen({
  children,
  scroll = true,
  refreshControl,
  padded = true,
  bottomInset = 0,
  keyboardInset = true,
}: Props) {
  const theme = useTheme();
  const body = (
    <View style={[styles.body, padded && styles.padded, bottomInset > 0 && { paddingBottom: bottomInset }, { backgroundColor: theme.colors.background }]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={["top", "left", "right"]}>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={keyboardInset}
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
