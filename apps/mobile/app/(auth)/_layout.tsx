import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        gestureEnabled: true,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="login" options={{ title: "Đăng nhập" }} />
      <Stack.Screen name="register" options={{ title: "Đăng ký" }} />
      <Stack.Screen name="forgot-password" options={{ title: "Khôi phục mật khẩu" }} />
    </Stack>
  );
}
