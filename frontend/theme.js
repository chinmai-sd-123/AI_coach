import { Platform } from "react-native";
import { DefaultTheme } from "@react-navigation/native";

export const colors = {
  background: "#f5efe7",
  backgroundMuted: "#efe4d7",
  surface: "#fffaf5",
  surfaceMuted: "#f7efe4",
  primary: "#1c7c74",
  primaryDeep: "#155953",
  secondary: "#d56d43",
  accent: "#f0bf5a",
  success: "#2f8b6f",
  danger: "#c45a4d",
  text: "#1d2433",
  textMuted: "#667085",
  border: "#e5d7c7",
  white: "#ffffff",
  shadow: "#2e2417",
};

export const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.secondary,
  },
  fonts: {
    ...DefaultTheme.fonts,
  },
};

export const appFonts = Platform.select({
  ios: {
    display: "AvenirNext-Heavy",
    heading: "AvenirNext-DemiBold",
    body: "AvenirNext-Regular",
  },
  android: {
    display: "sans-serif-medium",
    heading: "sans-serif-medium",
    body: "sans-serif",
  },
  default: {
    display: "Segoe UI",
    heading: "Segoe UI",
    body: "system-ui",
  },
});

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,
  pill: 999,
};

export const shadows = {
  card: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.09,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  soft: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
};
