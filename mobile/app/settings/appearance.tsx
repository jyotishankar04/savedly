import React from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Text } from "@/components/ui/text";
import { useSettings } from "@/hooks/useSettings";
import { useTheme } from "@/context/ThemeContext";
import { THEME } from "@/lib/theme";
import { cn } from "@/lib/utils";
import type { Settings } from "@/lib/settings";

const THEMES: { value: Settings["appearance"]["theme"]; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "system", label: "System", icon: "phone-portrait-outline" },
  { value: "light", label: "Light", icon: "sunny-outline" },
  { value: "dark", label: "Dark", icon: "moon-outline" },
];

const ACCENTS: { value: Settings["appearance"]["accentColor"]; color: string }[] = [
  { value: "blue", color: "#2563EB" },
  { value: "purple", color: "#7C3AED" },
  { value: "green", color: "#059669" },
  { value: "orange", color: "#EA580C" },
];

export default function AppearanceSettingsScreen() {
  const { settings, error, patch } = useSettings();
  const { setTheme } = useTheme();
  const { colorScheme } = useColorScheme();
  const resolved = colorScheme ?? "light";

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScreenHeader title="Appearance" />
      {error && <Text className="px-4 text-sm text-destructive">{error}</Text>}
      {!settings ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <View className="px-4">
          <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Theme</Text>
          <Text className="mb-3 mt-1 text-xs text-muted-foreground">Applies immediately and is saved to your account.</Text>
          <View className="flex-row gap-2.5">
            {THEMES.map((theme) => {
              const selected = settings.appearance.theme === theme.value;
              return (
                <Pressable
                  key={theme.value}
                  className={cn(
                    "flex-1 items-center gap-1.5 rounded-xl border border-border bg-secondary py-3.5",
                    selected && "border-primary bg-primary",
                  )}
                  onPress={() => {
                    setTheme(theme.value);
                    patch({ appearance: { theme: theme.value } });
                  }}
                >
                  <Ionicons
                    name={theme.icon}
                    size={18}
                    color={selected ? THEME[resolved].primaryForeground : THEME[resolved].foreground}
                  />
                  <Text className={cn("text-xs font-semibold", selected && "text-primary-foreground")}>{theme.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="mt-6 text-xs font-bold uppercase tracking-wide text-muted-foreground">Accent color</Text>
          <View className="mt-3 flex-row gap-3">
            {ACCENTS.map((accent) => {
              const selected = settings.appearance.accentColor === accent.value;
              return (
                <Pressable
                  key={accent.value}
                  style={{ backgroundColor: accent.color }}
                  className={cn("h-10 w-10 items-center justify-center rounded-full", selected && "border-2 border-foreground")}
                  onPress={() => patch({ appearance: { accentColor: accent.value } })}
                >
                  {selected && <Ionicons name="checkmark" size={16} color="#fff" />}
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
