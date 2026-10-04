import React, { createContext, useCallback, useContext, useState } from "react";
import { useRouter } from "expo-router";
import * as MediaLibrary from "expo-media-library";

interface ScreenshotPromptContextValue {
  visible: boolean;
  promptForScreenshot: () => void;
  dismiss: () => void;
  saveScreenshot: () => Promise<void>;
}

const ScreenshotPromptContext = createContext<ScreenshotPromptContextValue | undefined>(undefined);

export function ScreenshotPromptProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  const promptForScreenshot = useCallback(() => setVisible(true), []);
  const dismiss = useCallback(() => setVisible(false), []);

  const saveScreenshot = useCallback(async () => {
    setVisible(false);

    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted") return;

    // The screenshot callback carries no file reference — the most recent
    // photo is the closest available signal to "the screenshot just taken".
    const { assets } = await MediaLibrary.getAssetsAsync({
      mediaType: "photo",
      sortBy: "creationTime",
      first: 1,
    });
    const latest = assets[0];
    if (!latest) return;

    const info = await MediaLibrary.getAssetInfoAsync(latest);
    router.push({
      pathname: "/capture-confirm",
      params: { source: "screenshot", localUri: info.localUri ?? latest.uri, filename: latest.filename },
    });
  }, [router]);

  return (
    <ScreenshotPromptContext.Provider value={{ visible, promptForScreenshot, dismiss, saveScreenshot }}>
      {children}
    </ScreenshotPromptContext.Provider>
  );
}

export function useScreenshotPrompt(): ScreenshotPromptContextValue {
  const ctx = useContext(ScreenshotPromptContext);
  if (!ctx) throw new Error("useScreenshotPrompt must be used within a ScreenshotPromptProvider");
  return ctx;
}
