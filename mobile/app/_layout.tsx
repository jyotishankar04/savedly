import "@/global.css";
import React, { useEffect } from "react";
import { Stack, ThemeProvider as NavigationThemeProvider, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PortalHost } from "@rn-primitives/portal";
import { ShareIntentProvider, useShareIntentContext } from "expo-share-intent";
import { useScreenshotListener } from "expo-screen-capture";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { ScreenshotPromptProvider, useScreenshotPrompt } from "@/context/ScreenshotPromptContext";
import { ScreenshotPromptBanner } from "@/components/ScreenshotPromptBanner";
import { NAV_THEME } from "@/lib/theme";

/**
 * Lives inside both providers below so it can react to a share (redirect
 * into the capture flow) and to a screenshot (surface the save prompt) —
 * mounted once at the root so both work app-wide while foregrounded or
 * backgrounded, per the locked-in scope (no always-on background service).
 */
function RootEffects() {
  const router = useRouter();
  const { hasShareIntent } = useShareIntentContext();
  const { promptForScreenshot } = useScreenshotPrompt();

  useEffect(() => {
    if (hasShareIntent) {
      router.push({ pathname: "/capture-confirm", params: { source: "share-intent" } });
    }
  }, [hasShareIntent, router]);

  // expo-screen-capture's callback carries no file reference — it only says
  // a screenshot happened. The prompt (not a silent auto-upload) then reads
  // the actual image via expo-media-library once the user taps "Save".
  useScreenshotListener(() => promptForScreenshot());

  return null;
}

function ThemedNavigation() {
  const { colorScheme } = useTheme();
  return (
    <NavigationThemeProvider value={NAV_THEME[colorScheme]}>
      <RootEffects />
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }} />
      <ScreenshotPromptBanner />
      <PortalHost />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <ShareIntentProvider>
          <AuthProvider>
            <ScreenshotPromptProvider>
              <ThemedNavigation />
            </ScreenshotPromptProvider>
          </AuthProvider>
        </ShareIntentProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
