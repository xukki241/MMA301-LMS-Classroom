// RoleTabs - bottom tab navigator switching between student and teacher views
import { type ComponentProps } from "react";
import { StyleSheet, Text } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHideTabBarForKeyboard } from "@/src/components/navigation/tab-bar-visibility";

type IconName = ComponentProps<typeof Ionicons>["name"];

const screens: { name: string; title: string; icon: IconName; iconOn: IconName }[] = [
  { name: "index", title: "Trang chủ", icon: "home-outline", iconOn: "home" },
  { name: "schedule", title: "Lịch", icon: "calendar-outline", iconOn: "calendar" },
  { name: "work", title: "Việc", icon: "checkbox-outline", iconOn: "checkbox" },
  { name: "classes", title: "Lớp", icon: "albums-outline", iconOn: "albums" },
  { name: "profile", title: "Tôi", icon: "person-outline", iconOn: "person" },
];

/** Icon tab (khung 28px) + nhãn 11px cần ~64px; 56px cắt chữ và chỉ còn nền. */
const TAB_BAR_CONTENT_HEIGHT = 64;

export function RoleTabs() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const hideForKeyboard = useHideTabBarForKeyboard();
  const barHeight = TAB_BAR_CONTENT_HEIGHT + insets.bottom;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: barHeight,
          minHeight: barHeight,
          flexShrink: 0,
          paddingBottom: insets.bottom,
          // Navigator mặc định dịch tab ra khỏi màn (position absolute + translateY)
          // khi tabBarHideOnKeyboard kẹt sau keyboardDidShow. Ghim tab trong cột flex.
          position: "relative",
          transform: [{ translateY: 0 }],
          display: hideForKeyboard ? "none" : "flex",
          zIndex: 8,
          elevation: 8,
        },
        tabBarItemStyle: { minHeight: 48 },
        tabBarLabel: ({ color, children }) => (
          <Text numberOfLines={1} style={{ color, fontSize: 11, fontWeight: "700", textAlign: "center" }}>
            {children}
          </Text>
        ),
        tabBarHideOnKeyboard: false,
        animation: "shift",
      }}
    >
      {screens.map((screen) => (
        <Tabs.Screen
          key={screen.name}
          name={screen.name}
          options={{
            title: screen.title,
            tabBarIcon: ({ color, focused, size }) => (
              <Ionicons name={focused ? screen.iconOn : screen.icon} size={size} color={color} />
            ),
            tabBarAccessibilityLabel: screen.title,
          }}
        />
      ))}
    </Tabs>
  );
}
