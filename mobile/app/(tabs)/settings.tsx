import React from "react";
import { Pressable, View, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { useAuth } from "@/context/AuthContext";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { THEME } from "@/lib/theme";

const ROWS: { href: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { href: "/settings/appearance", label: "Appearance", icon: "color-palette-outline" },
  { href: "/settings/notifications", label: "Notifications", icon: "notifications-outline" },
  { href: "/settings/ai", label: "AI & Search", icon: "sparkles-outline" },
  { href: "/settings/capture", label: "Capture", icon: "bookmark-outline" },
  { href: "/settings/privacy", label: "Privacy & Data", icon: "shield-checkmark-outline" },
  { href: "/settings/billing", label: "Billing", icon: "card-outline" },
];

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const resolved = colorScheme ?? "light";

  const handleSignOut = async () => {
    await signOut();
    router.replace("/auth/login");
  };

  return (
    <SafeAreaView className="flex-1 gap-5 bg-background p-5" edges={["top"]}>
      <Text className="pt-2 text-3xl font-bold tracking-tight">Settings</Text>

      <View className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-primary">
          <Text className="text-lg font-bold text-primary-foreground">
            {(user?.name ?? user?.email ?? "?").charAt(0).toUpperCase()}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold">{user?.name ?? user?.email}</Text>
          <Text className="mt-0.5 text-xs text-muted-foreground">{user?.email}</Text>
        </View>
      </View>

      <View className="overflow-hidden rounded-xl border border-border">
        {ROWS.map((row) => (
          <Pressable
            key={row.href}
            className="flex-row items-center gap-3 border-b border-border bg-card px-3.5 py-3.5 last:border-b-0"
            onPress={() => router.push(row.href as never)}
          >
            <Ionicons name={row.icon} size={19} color={THEME[resolved].foreground} />
            <Text className="flex-1 text-sm font-medium">{row.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={THEME[resolved].mutedForeground} />
          </Pressable>
        ))}
      </View>

      <Button variant="outline" className="mt-auto border-destructive" onPress={handleSignOut}>
        <Text className="font-semibold text-destructive">Sign out</Text>
      </Button>
    </SafeAreaView>
  );
}
