import { type ComponentProps } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing } from "@/src/theme/tokens";

type IconName = ComponentProps<typeof Ionicons>["name"];

const screens: { name: string; title: string; icon: IconName; iconOn: IconName }[] = [
  { name: "index", title: "Trang chủ", icon: "home-outline", iconOn: "home" },
  { name: "classes", title: "Lớp học", icon: "albums-outline", iconOn: "albums" },
  { name: "profile", title: "Tôi", icon: "person-outline", iconOn: "person" },
];

const TAB_BAR_CONTENT_HEIGHT = 56;

export function RoleTabs() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
          height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
          paddingTop: spacing.xs,
          paddingBottom: insets.bottom,
        },
        tabBarItemStyle: { minHeight: 48 },
        tabBarLabelStyle: { fontWeight: "700", fontSize: 11 },
        tabBarHideOnKeyboard: true,
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
