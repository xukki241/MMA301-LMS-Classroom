export const palette = {
  primary: "#1B2A49",
  primaryDark: "#132039",
  primarySoft: "#E7EDF5",
  secondary: "#2D6A6A",
  secondarySoft: "#DDEDEA",
  accent: "#C85A32",
  success: "#2F7D62",
  warning: "#B7791F",
  danger: "#B94A48",
  dangerSoft: "#F7E2DE",
  ink: "#1F2933",
  inkMuted: "#596575",
  inkFaint: "#8B95A1",
  canvas: "#F8F4EC",
  surface: "#FFFDF8",
  line: "#E5DCCF",
  teacher: "#1B2A49",
  student: "#2D6A6A",
} as const;

export const darkPalette = {
  primary: "#60A5FA",
  primaryDark: "#3B82F6",
  primarySoft: "#1E3A5F",
  secondary: "#2DD4BF",
  secondarySoft: "#134E4A",
  accent: "#FBBF24",
  success: "#34D399",
  warning: "#FBBF24",
  danger: "#F87171",
  dangerSoft: "#7F1D1D",
  ink: "#F8FAFC",
  inkMuted: "#CBD5E1",
  inkFaint: "#64748B",
  canvas: "#0B1220",
  surface: "#111827",
  line: "#1F2937",
  teacher: "#A5B4FC",
  student: "#5EEAD4",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 30, fontWeight: "800" as const, letterSpacing: -0.6 },
  title: { fontSize: 22, fontWeight: "700" as const, letterSpacing: -0.3 },
  subtitle: { fontSize: 17, fontWeight: "600" as const },
  body: { fontSize: 15, fontWeight: "400" as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: "500" as const },
  label: { fontSize: 12, fontWeight: "700" as const, letterSpacing: 0.4 },
} as const;

export const elevation = {
  card: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
} as const;
