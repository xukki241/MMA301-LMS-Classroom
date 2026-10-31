import { useEffect, useState, type ReactNode } from "react";
import { Keyboard, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Dialog, HelperText, Icon, Text } from "react-native-paper";
import { palette, radius, spacing } from "@/src/theme/tokens";

/** Keeps a focused field and its error above the software keyboard. */
export const keyboardBehavior = "padding" as const;

export function useKeyboardLift() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, (event) => {
      setHeight(event.endCoordinates?.height ?? 0);
    });
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}

export function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <View accessibilityRole="alert">
      <HelperText type="error" visible padding="none" style={styles.field}>
        {message}
      </HelperText>
    </View>
  );
}

export function FormNotice({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.banner}>
      <Icon source="alert-circle-outline" size={20} color={palette.danger} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

export function FormDialogScroll({ children }: { children: ReactNode }) {
  return (
    <Dialog.ScrollArea style={styles.scrollArea}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.dialogScroll}>
        {children}
      </ScrollView>
    </Dialog.ScrollArea>
  );
}

const styles = StyleSheet.create({
  field: {
    marginTop: 2,
    paddingHorizontal: spacing.xs,
  },
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: palette.dangerSoft,
    borderColor: palette.danger,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: spacing.sm,
  },
  text: {
    flex: 1,
    color: palette.danger,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  scrollArea: {
    maxHeight: 360,
    paddingHorizontal: 0,
  },
  dialogScroll: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
});
