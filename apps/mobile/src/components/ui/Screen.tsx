import { useContext, type ReactElement, type ReactNode } from "react";
import { ScrollView, StyleSheet, View, type RefreshControlProps } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "react-native-paper";
import { BottomTabBarHeightContext } from "expo-router/build/react-navigation/bottom-tabs/utils/BottomTabBarHeightContext";
import { HeaderShownContext } from "expo-router/build/react-navigation/elements/Header/HeaderShownContext";
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
  const insets = useSafeAreaInsets();
  const inTabs = useContext(BottomTabBarHeightContext) != null;
  const headerShown = useContext(HeaderShownContext);
  const contentBottom = (bottomInset > 0 ? bottomInset : padded ? spacing.xxxl : 0) + (inTabs ? 0 : insets.bottom);
  const body = (
    <View style={[styles.body, padded && styles.padded, contentBottom > 0 && { paddingBottom: contentBottom }, { backgroundColor: theme.colors.background }]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
      edges={headerShown ? ["left", "right"] : ["top", "left", "right"]}
    >
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
