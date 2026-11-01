/**
 * Inset của thanh điều hướng Android thường thấp hơn mức này.
 * Bàn phím thật cao hơn, nên sự kiện keyboardDidShow chỉ cao bằng inset
 * (Expo Go, edge-to-edge) không được coi là bàn phím.
 */
export const KEYBOARD_OCCLUSION_MIN_PX = 120;

export function shouldHideTabBar(input: {
  platform: string;
  keyboardHeight: number;
  keyboardVisible: boolean;
  windowShortfall: number;
}): boolean {
  if (input.platform === "web") return false;
  if (!input.keyboardVisible) return false;
  if (input.keyboardHeight < KEYBOARD_OCCLUSION_MIN_PX) return false;
  // Android: chỉ ẩn khi cửa sổ thực sự co lại. Expo Go có thể bắn keyboardDidShow
  // cho inset thanh hệ thống rồi không bao giờ bắn keyboardDidHide; khi cửa sổ
  // cao trở lại, thanh tab phải hiện.
  if (input.platform === "android") return input.windowShortfall >= KEYBOARD_OCCLUSION_MIN_PX;
  return true;
}
