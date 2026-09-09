import React from "react";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useScreenshotPrompt } from "@/context/ScreenshotPromptContext";
import { Text } from "@/components/ui/text";

// Deliberately fixed dark-on-white (not theme tokens) — an alert-style
// overlay that should look the same regardless of light/dark mode, same as
// most apps' toast/snackbar surfaces.
export function ScreenshotPromptBanner() {
  const { visible, dismiss, saveScreenshot } = useScreenshotPrompt();

  if (!visible) return null;

  return (
    <SafeAreaView className="absolute left-0 right-0 top-0 z-[100]" pointerEvents="box-none">
      <View className="mx-3 mt-2 flex-row items-center justify-between rounded-[14px] bg-neutral-900 px-3.5 py-2.5 shadow-lg shadow-black/20">
        <Text className="mr-2 shrink text-[13px] font-medium text-white">Screenshot detected — save to Memora?</Text>
        <View className="flex-row gap-2">
          <Pressable onPress={dismiss} className="px-2.5 py-1.5">
            <Text className="text-xs font-semibold text-neutral-400">Dismiss</Text>
          </Pressable>
          <Pressable onPress={saveScreenshot} className="rounded-full bg-white px-3.5 py-1.5">
            <Text className="text-xs font-bold text-neutral-900">Save</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
