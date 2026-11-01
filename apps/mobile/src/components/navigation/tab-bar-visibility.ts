import { useEffect, useState } from "react";
import { AppState, Dimensions, Keyboard, Platform } from "react-native";
import { shouldHideTabBar } from "./tab-bar-rules";

export { shouldHideTabBar } from "./tab-bar-rules";

function readOcclusion(): boolean {
  if (Platform.OS === "web") return false;
  const metrics = typeof Keyboard.metrics === "function" ? Keyboard.metrics() : undefined;
  const visible = typeof Keyboard.isVisible === "function" ? Keyboard.isVisible() : false;
  const shortfall = Dimensions.get("screen").height - Dimensions.get("window").height;
  return shouldHideTabBar({
    platform: Platform.OS,
    keyboardHeight: metrics?.height ?? 0,
    keyboardVisible: visible,
    windowShortfall: shortfall,
  });
}

/** Ẩn tab chỉ khi bàn phím đang che, và luôn đo lại để không kẹt ở trạng thái ẩn. */
export function useHideTabBarForKeyboard(): boolean {
  const [hide, setHide] = useState(false);

  useEffect(() => {
    if (Platform.OS === "web") return;
    let poll: ReturnType<typeof setInterval> | undefined;
    const measure = () => {
      const next = readOcclusion();
      setHide(next);
      if (next && poll == null) {
        poll = setInterval(measure, 500);
      } else if (!next && poll != null) {
        clearInterval(poll);
        poll = undefined;
      }
    };
    measure();
    const subscriptions = [
      Keyboard.addListener("keyboardDidShow", measure),
      Keyboard.addListener("keyboardDidHide", measure),
      Keyboard.addListener("keyboardWillShow", measure),
      Keyboard.addListener("keyboardWillHide", measure),
      Dimensions.addEventListener("change", measure),
      AppState.addEventListener("change", measure),
    ];
    return () => {
      if (poll != null) clearInterval(poll);
      for (const subscription of subscriptions) subscription.remove();
    };
  }, []);

  return hide;
}
