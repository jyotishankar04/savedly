import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "nativewind";
import { getSettings, type Settings } from "@/lib/settings";

interface ThemeContextValue {
  /** The resolved scheme actually being rendered right now ("light"/"dark"). */
  colorScheme: "light" | "dark";
  /** Forces the whole app to a scheme immediately, independent of the OS setting. */
  setTheme: (theme: Settings["appearance"]["theme"]) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * On boot, applies the theme already saved on the account (lib/settings.ts,
 * GET /settings) via NativeWind's setColorScheme — this is what was missing
 * before: the Appearance screen persisted a choice but nothing ever read it
 * back to actually re-theme the app.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { colorScheme, setColorScheme } = useColorScheme();

  useEffect(() => {
    getSettings()
      .then((settings: Settings) => setColorScheme(settings.appearance.theme))
      .catch(() => {
        // Not signed in yet, or the request failed — fall back to the OS
        // scheme (NativeWind's default) rather than blocking app boot on it.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on boot
  }, []);

  const setTheme = (theme: Settings["appearance"]["theme"]) => setColorScheme(theme);

  return (
    <ThemeContext.Provider value={{ colorScheme: colorScheme ?? "light", setTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
