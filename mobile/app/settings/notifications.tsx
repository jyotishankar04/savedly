import React from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ToggleRow } from "@/components/ToggleRow";
import { Text } from "@/components/ui/text";
import { useSettings } from "@/hooks/useSettings";

export default function NotificationsSettingsScreen() {
  const { settings, error, patch } = useSettings();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScreenHeader title="Notifications" />
      {error && <Text className="px-4 text-sm text-destructive">{error}</Text>}
      {!settings ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <View className="px-4">
          <ToggleRow
            label="Weekly summary"
            description="A digest of what you saved this week."
            value={settings.notifications.weeklySummary}
            onValueChange={(value) => patch({ notifications: { weeklySummary: value } })}
          />
          <ToggleRow
            label="Forgotten memories"
            description="Gentle nudges about things you saved and haven't revisited."
            value={settings.notifications.forgottenMemories}
            onValueChange={(value) => patch({ notifications: { forgottenMemories: value } })}
          />
          <ToggleRow
            label="Product updates"
            description="New features and announcements."
            value={settings.notifications.productUpdates}
            onValueChange={(value) => patch({ notifications: { productUpdates: value } })}
          />
        </View>
      )}
    </SafeAreaView>
  );
}
