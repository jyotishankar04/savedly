import React from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ToggleRow } from "@/components/ToggleRow";
import { Text } from "@/components/ui/text";
import { useSettings } from "@/hooks/useSettings";

export default function CaptureSettingsScreen() {
  const { settings, error, patch } = useSettings();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScreenHeader title="Capture" />
      {error && <Text className="px-4 text-sm text-destructive">{error}</Text>}
      {!settings ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <View className="px-4">
          <ToggleRow
            label="Extract content"
            description="Pull the full text/content when you save a link."
            value={settings.capture.extractContent}
            onValueChange={(value) => patch({ capture: { extractContent: value } })}
          />
          <ToggleRow
            label="Generate title"
            description="Auto-title captures that don't have one."
            value={settings.capture.generateTitle}
            onValueChange={(value) => patch({ capture: { generateTitle: value } })}
          />
          <ToggleRow
            label="Generate summary"
            description="Auto-summarize saved content."
            value={settings.capture.generateSummary}
            onValueChange={(value) => patch({ capture: { generateSummary: value } })}
          />
          <ToggleRow
            label="Suggest tags"
            description="Auto-tag new memories."
            value={settings.capture.suggestTags}
            onValueChange={(value) => patch({ capture: { suggestTags: value } })}
          />

          <View className="py-3.5 opacity-50">
            <View className="flex-1">
              <Text className="text-sm font-semibold">Default collection</Text>
              <Text className="mt-0.5 text-xs text-muted-foreground">Coming soon.</Text>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
