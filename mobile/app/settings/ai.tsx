import React from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ToggleRow } from "@/components/ToggleRow";
import { Text } from "@/components/ui/text";
import { useSettings } from "@/hooks/useSettings";

export default function AiSettingsScreen() {
  const { settings, error, patch } = useSettings();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScreenHeader title="AI & Search" />
      {error && <Text className="px-4 text-sm text-destructive">{error}</Text>}
      {!settings ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <View className="px-4">
          <ToggleRow
            label="Auto-organization"
            description="Automatically sort new memories into collections."
            value={settings.ai.autoOrganization}
            onValueChange={(value) => patch({ ai: { autoOrganization: value } })}
          />
          <ToggleRow
            label="Summaries"
            description="Generate AI summaries for saved content."
            value={settings.ai.summaries}
            onValueChange={(value) => patch({ ai: { summaries: value } })}
          />
          <ToggleRow
            label="Related memories"
            description="Surface related items on a memory's detail page."
            value={settings.ai.relatedMemories}
            onValueChange={(value) => patch({ ai: { relatedMemories: value } })}
          />
          <ToggleRow
            label="Semantic search"
            description="Search by meaning, not just keywords."
            value={settings.ai.semanticSearch}
            onValueChange={(value) => patch({ ai: { semanticSearch: value } })}
          />
          <ToggleRow
            label="Ask Memora"
            description="Enable the AI chat over your memories."
            value={settings.ai.askMemora}
            onValueChange={(value) => patch({ ai: { askMemora: value } })}
          />
        </View>
      )}
    </SafeAreaView>
  );
}
