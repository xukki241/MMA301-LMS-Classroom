import { palette, darkPalette } from "@/src/theme/tokens";

export default {
  light: {
    text: palette.ink,
    background: palette.canvas,
    tint: palette.primary,
    tabIconDefault: palette.inkFaint,
    tabIconSelected: palette.primary,
  },
  dark: {
    text: darkPalette.ink,
    background: darkPalette.canvas,
    tint: darkPalette.primary,
    tabIconDefault: darkPalette.inkFaint,
    tabIconSelected: darkPalette.primary,
  },
};
