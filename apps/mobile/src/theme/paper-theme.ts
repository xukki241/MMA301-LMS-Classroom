import {
  MD3DarkTheme,
  MD3LightTheme,
  type MD3Theme,
} from "react-native-paper";
import { DarkTheme as NavDark, DefaultTheme as NavLight, type Theme as NavTheme } from "@react-navigation/native";
import { darkPalette, palette, radius } from "./tokens";

export const lightPaperTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: radius.md,
  colors: {
    ...MD3LightTheme.colors,
    primary: palette.primary,
    onPrimary: "#FFFFFF",
    primaryContainer: palette.primarySoft,
    onPrimaryContainer: palette.primaryDark,
    secondary: palette.secondary,
    onSecondary: "#FFFFFF",
    secondaryContainer: palette.secondarySoft,
    onSecondaryContainer: palette.secondary,
    tertiary: palette.accent,
    error: palette.danger,
    onError: "#FFFFFF",
    errorContainer: palette.dangerSoft,
    background: palette.canvas,
    onBackground: palette.ink,
    surface: palette.surface,
    onSurface: palette.ink,
    surfaceVariant: "#EEF2FF",
    onSurfaceVariant: palette.inkMuted,
    outline: palette.line,
    outlineVariant: palette.line,
    inverseSurface: palette.ink,
    inverseOnSurface: palette.surface,
    inversePrimary: palette.primarySoft,
    elevation: {
      ...MD3LightTheme.colors.elevation,
      level1: palette.surface,
      level2: palette.surface,
      level3: palette.surface,
    },
  },
};

export const darkPaperTheme: MD3Theme = {
  ...MD3DarkTheme,
  roundness: radius.md,
  colors: {
    ...MD3DarkTheme.colors,
    primary: darkPalette.primary,
    onPrimary: "#0B1220",
    primaryContainer: darkPalette.primarySoft,
    onPrimaryContainer: darkPalette.primary,
    secondary: darkPalette.secondary,
    onSecondary: "#0B1220",
    secondaryContainer: darkPalette.secondarySoft,
    onSecondaryContainer: darkPalette.secondary,
    tertiary: darkPalette.accent,
    error: darkPalette.danger,
    onError: "#0B1220",
    errorContainer: darkPalette.dangerSoft,
    background: darkPalette.canvas,
    onBackground: darkPalette.ink,
    surface: darkPalette.surface,
    onSurface: darkPalette.ink,
    surfaceVariant: "#1E293B",
    onSurfaceVariant: darkPalette.inkMuted,
    outline: darkPalette.line,
    outlineVariant: darkPalette.line,
    inverseSurface: darkPalette.ink,
    inverseOnSurface: darkPalette.canvas,
    inversePrimary: darkPalette.primaryDark,
    elevation: {
      ...MD3DarkTheme.colors.elevation,
      level1: darkPalette.surface,
      level2: darkPalette.surface,
      level3: darkPalette.surface,
    },
  },
};

export const lightNavTheme: NavTheme = {
  ...NavLight,
  colors: {
    ...NavLight.colors,
    primary: palette.primary,
    background: palette.canvas,
    card: palette.surface,
    text: palette.ink,
    border: palette.line,
    notification: palette.danger,
  },
};

export const darkNavTheme: NavTheme = {
  ...NavDark,
  colors: {
    ...NavDark.colors,
    primary: darkPalette.primary,
    background: darkPalette.canvas,
    card: darkPalette.surface,
    text: darkPalette.ink,
    border: darkPalette.line,
    notification: darkPalette.danger,
  },
};
