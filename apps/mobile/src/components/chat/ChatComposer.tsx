import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { IconButton, TextInput, useTheme } from "react-native-paper";
import { impactLight } from "@/src/lib/haptics";
import { spacing } from "@/src/theme/tokens";

export function ChatComposer({ onSend }: { onSend: (text: string) => void }) {
  const theme = useTheme();
  const [text, setText] = useState("");

  const submit = () => {
    const next = text.trim();
    if (!next) return;
    impactLight();
    onSend(next);
    setText("");
  };

  return (
    <View style={[styles.wrap, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outline }]}>
      <TextInput
        mode="outlined"
        placeholder="Nhắn tin..."
        value={text}
        onChangeText={setText}
        style={styles.input}
        dense
      />
      <IconButton icon="send" mode="contained" onPress={submit} disabled={!text.trim()} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  input: { flex: 1, backgroundColor: "transparent" },
});
