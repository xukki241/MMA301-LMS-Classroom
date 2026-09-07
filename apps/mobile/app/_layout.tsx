import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { PaperProvider } from "react-native-paper";
import { ThemeProvider } from "@react-navigation/native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import "react-native-reanimated";

import { useColorScheme } from "@/components/useColorScheme";
import { AuthProvider } from "@/src/lib/auth-context";
import { queryClient } from "@/src/lib/query-client";
import { darkNavTheme, darkPaperTheme, lightNavTheme, lightPaperTheme } from "@/src/theme/paper-theme";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const paperTheme = colorScheme === "dark" ? darkPaperTheme : lightPaperTheme;
  const navTheme = colorScheme === "dark" ? darkNavTheme : lightNavTheme;

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider
        theme={paperTheme}
        settings={{
          icon: (props) => <MaterialCommunityIcons {...props} />,
        }}
      >
        <AuthProvider>
          <ThemeProvider value={navTheme}>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: "ios_from_right",
                gestureEnabled: true,
                fullScreenGestureEnabled: true,
              }}
            >
              <Stack.Screen name="index" options={{ animation: "fade" }} />
              <Stack.Screen name="(auth)" options={{ animation: "fade_from_bottom" }} />
              <Stack.Screen name="(teacher)" options={{ animation: "fade" }} />
              <Stack.Screen name="(student)" options={{ animation: "fade" }} />
              <Stack.Screen
                name="class/[id]"
                options={{
                  headerShown: true,
                  title: "Chi tiết lớp",
                  animation: "slide_from_right",
                }}
              />
            </Stack>
          </ThemeProvider>
        </AuthProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}
