import React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Text } from "@/components/ui/text";
import { THEME } from "@/lib/theme";
import { cn } from "@/lib/utils";

const ROWS: { label: string; icon: keyof typeof Ionicons.glyphMap; destructive?: boolean }[] = [
  { label: "Export your data", icon: "download-outline" },
  { label: "Download your files", icon: "cloud-download-outline" },
  { label: "Clear all memories", icon: "trash-outline", destructive: true },
  { label: "Delete account", icon: "person-remove-outline", destructive: true },
];

// Mirrors client/app/(platfrom)/app/settings/privacy — these aren't implemented
// server-side yet on web either, so this stays a faithful placeholder rather
// than a mobile-only stub.
export default function PrivacySettingsScreen() {
  const { colorScheme } = useColorScheme();
  const resolved = colorScheme ?? "light";

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScreenHeader title="Privacy & Data" />
      <View className="px-4 opacity-60">
        {ROWS.map((row) => (
          <View key={row.label} className="flex-row items-center gap-3 border-b border-border py-3.5">
            <Ionicons name={row.icon} size={19} color={row.destructive ? THEME[resolved].destructive : THEME[resolved].foreground} />
            <Text className={cn("flex-1 text-sm font-medium", row.destructive && "text-destructive")}>{row.label}</Text>
            <Text className="text-[11px] text-muted-foreground">Coming soon</Text>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}
