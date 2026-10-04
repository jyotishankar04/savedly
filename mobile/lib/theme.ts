import type { Theme } from "@react-navigation/native";

// Mirrors global.css exactly, which itself mirrors client/app/globals.css
// (OKLCH values converted to hex — RN's style engine doesn't understand
// oklch()). Keep all three files in sync by hand if the web theme changes.
export const THEME = {
  light: {
    background: "#ffffff",
    foreground: "#0a0a0a",
    card: "#ffffff",
    cardForeground: "#0a0a0a",
    popover: "#ffffff",
    popoverForeground: "#0a0a0a",
    primary: "#1447e6",
    primaryForeground: "#fafafa",
    secondary: "#f5f5f5",
    secondaryForeground: "#171717",
    muted: "#f5f5f5",
    mutedForeground: "#737373",
    accent: "#f5f5f5",
    accentForeground: "#171717",
    destructive: "#e7000b",
    destructiveForeground: "#ffffff",
    border: "#e5e5e5",
    input: "#e5e5e5",
    ring: "#1447e6",
    radius: "1.05rem",
  },
  dark: {
    background: "#151515",
    foreground: "#fafafa",
    card: "#1f1f1f",
    cardForeground: "#fafafa",
    popover: "#262829",
    popoverForeground: "#fafafa",
    primary: "#2b7fff",
    primaryForeground: "#fafafa",
    secondary: "#262829",
    secondaryForeground: "#fafafa",
    muted: "#262829",
    mutedForeground: "#c9cacc",
    accent: "#2b394b",
    accentForeground: "#fafafa",
    destructive: "#ff6467",
    destructiveForeground: "#fafafa",
    border: "#1f1f1f",
    input: "#2b3646",
    ring: "#1a51a2",
    radius: "1.05rem",
  },
} as const;

export const NAV_THEME: { light: Theme; dark: Theme } = {
  light: {
    dark: false,
    colors: {
      background: THEME.light.background,
      border: THEME.light.border,
      card: THEME.light.card,
      notification: THEME.light.destructive,
      primary: THEME.light.primary,
      text: THEME.light.foreground,
    },
    fonts: {
      regular: { fontFamily: "System", fontWeight: "400" },
      medium: { fontFamily: "System", fontWeight: "500" },
      bold: { fontFamily: "System", fontWeight: "700" },
      heavy: { fontFamily: "System", fontWeight: "900" },
    },
  },
  dark: {
    dark: true,
    colors: {
      background: THEME.dark.background,
      border: THEME.dark.border,
      card: THEME.dark.card,
      notification: THEME.dark.destructive,
      primary: THEME.dark.primary,
      text: THEME.dark.foreground,
    },
    fonts: {
      regular: { fontFamily: "System", fontWeight: "400" },
      medium: { fontFamily: "System", fontWeight: "500" },
      bold: { fontFamily: "System", fontWeight: "700" },
      heavy: { fontFamily: "System", fontWeight: "900" },
    },
  },
};
