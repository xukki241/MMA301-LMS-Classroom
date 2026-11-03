import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import { View } from "react-native";
import { ActivityIndicator, PaperProvider } from "react-native-paper";
import { ThemeProvider } from "expo-router/react-navigation";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import "react-native-reanimated";

import { useColorScheme } from "@/components/useColorScheme";
import { AuthProvider, useAuth } from "@/src/lib/auth-context";
import { Screen } from "@/src/components/ui/Screen";
import { queryClient } from "@/src/lib/query-client";
import { NetworkProvider } from "@/src/lib/network-context";
import { OfflineBanner } from "@/src/components/ui/OfflineBanner";
import { darkNavTheme, darkPaperTheme, lightNavTheme, lightPaperTheme } from "@/src/theme/paper-theme";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const paperTheme = colorScheme === "dark" ? darkPaperTheme : lightPaperTheme;
  const navTheme = colorScheme === "dark" ? darkNavTheme : lightNavTheme;
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
    ...MaterialCommunityIcons.font,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <NetworkProvider>
        <AuthProvider>
          <PaperProvider
            theme={paperTheme}
            settings={{
              icon: (props) => <MaterialCommunityIcons {...props} />,
            }}
          >
            <ThemeProvider value={navTheme}>
              <View style={{ flex: 1, minHeight: 0 }}>
                <OfflineBanner />
                <View style={{ flex: 1, minHeight: 0 }}>
                  <AuthenticatedStack />
                </View>
              </View>
            </ThemeProvider>
          </PaperProvider>
        </AuthProvider>
      </NetworkProvider>
    </QueryClientProvider>
  );
}

function AuthenticatedStack() {
  const { loading, token, user } = useAuth();
  if (loading) {
    return <Screen><ActivityIndicator accessibilityLabel="Đang khôi phục phiên đăng nhập" /></Screen>;
  }
  const signedIn = Boolean(token && user);
  return (
    <Stack screenOptions={{ headerShown: false, animation: "ios_from_right", gestureEnabled: true, fullScreenGestureEnabled: true }}>
      <Stack.Screen name="index" options={{ animation: "fade" }} />
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" options={{ animation: "fade_from_bottom" }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && user?.role === "teacher"}>
        <Stack.Screen name="(teacher)" options={{ animation: "fade" }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && user?.role === "student"}>
        <Stack.Screen name="(student)" options={{ animation: "fade" }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="class/[id]" options={{ headerShown: true, title: "Chi tiết lớp", animation: "slide_from_right" }} />
        <Stack.Screen name="class/[id]/stream" options={{ headerShown: true, title: "Bảng tin", animation: "slide_from_right" }} />
        <Stack.Screen name="class/[id]/schedule" options={{ headerShown: true, title: "Lịch của lớp", animation: "slide_from_right" }} />
        <Stack.Screen name="class/[id]/materials" options={{ headerShown: true, title: "Tài nguyên", animation: "slide_from_right" }} />
        <Stack.Screen name="class/[id]/exercises" options={{ headerShown: true, title: "Bài tập", animation: "slide_from_right" }} />
        <Stack.Screen
          name="class/[id]/exercise/[exerciseId]"
          options={{ headerShown: true, title: "Chi tiết bài tập", animation: "slide_from_right" }}
        />
        <Stack.Screen name="gradebook" options={{ headerShown: true, title: "Bảng điểm", animation: "slide_from_right" }} />
        <Stack.Screen name="payments" options={{ headerShown: true, title: "Lịch sử giao dịch", animation: "slide_from_right" }} />
        <Stack.Screen name="submissions" options={{ headerShown: true, title: "Lịch sử nộp bài", animation: "slide_from_right" }} />
        <Stack.Screen name="account" options={{ headerShown: true, title: "Thông tin cá nhân", animation: "slide_from_right" }} />
        <Stack.Screen name="change-password" options={{ headerShown: true, title: "Đổi mật khẩu", animation: "slide_from_right" }} />
      </Stack.Protected>
    </Stack>
  );
}
