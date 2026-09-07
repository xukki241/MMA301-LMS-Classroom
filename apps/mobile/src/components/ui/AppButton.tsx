import { Pressable, StyleSheet } from "react-native";
import { Button, type ButtonProps } from "react-native-paper";
import { impactLight } from "@/src/lib/haptics";

type Props = Omit<ButtonProps, "children"> & {
  children: string;
  haptic?: boolean;
};

export function AppButton({ children, haptic = true, onPress, loading, disabled, ...rest }: Props) {
  return (
    <Button
      mode="contained"
      loading={loading}
      disabled={disabled || loading}
      contentStyle={styles.content}
      labelStyle={styles.label}
      onPress={(event) => {
        if (haptic) impactLight();
        onPress?.(event);
      }}
      {...rest}
    >
      {children}
    </Button>
  );
}

export function GhostButton({
  onPress,
  children,
}: {
  onPress?: () => void;
  children: string;
}) {
  return (
    <Pressable
      onPress={() => {
        impactLight();
        onPress?.();
      }}
      style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
    >
      <Button mode="text" compact onPress={onPress}>
        {children}
      </Button>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 6 },
  label: { fontWeight: "700", letterSpacing: 0.2 },
  ghost: { alignSelf: "flex-start" },
  pressed: { opacity: 0.7 },
});
