import React from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { Text } from "@/components/ui/text";
import { THEME } from "@/lib/theme";

/** The root Stack has headerShown:false everywhere, so every pushed screen renders its own. */
export function ScreenHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  const router = useRouter();
  const { colorScheme } = useColorScheme();

  return (
    <View className="flex-row items-center gap-1 px-2 py-2.5">
      <Pressable hitSlop={12} onPress={() => router.back()} className="p-1">
        <Ionicons name="chevron-back" size={24} color={THEME[colorScheme ?? "light"].foreground} />
      </Pressable>
      <Text variant="large" className="flex-1 font-bold" numberOfLines={1}>
        {title}
      </Text>
      <View className="flex-row items-center gap-2">{right}</View>
    </View>
  );
}
