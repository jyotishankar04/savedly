import React, { useState } from "react";
import { Image, View } from "react-native";
import { LinearGradient } from "@/components/ui/linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import type { Memory } from "@/lib/memories";
import { MEMORY_TYPE_ICONS, getPlatformFallback } from "@/lib/memoryDisplay";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { THEME } from "@/lib/theme";

const TILE_CLASS = "aspect-video w-full rounded-[10px] bg-muted";

/**
 * Same fallback chain as the web client (client/components/memory-thumbnail.tsx):
 * real preview image -> platform-branded gradient tile -> generic type-icon tile.
 * Never renders a blank box.
 */
export function MemoryThumbnail({ item, className }: { item: Memory; className?: string }) {
  const [failed, setFailed] = useState(false);
  const icon = MEMORY_TYPE_ICONS[item.type];
  const { colorScheme } = useColorScheme();
  const resolved = colorScheme ?? "light";

  if (item.previewImageUrl && !failed) {
    return (
      <Image
        source={{ uri: item.previewImageUrl }}
        className={cn(TILE_CLASS, className)}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    );
  }

  if (item.platform) {
    const fallback = getPlatformFallback(item.platform);
    return (
      <LinearGradient colors={fallback.colors} className={cn(TILE_CLASS, "items-center justify-center gap-1", className)}>
        <Ionicons name={icon} size={20} color="#fff" />
        <Text className="text-[10px] font-bold tracking-wide text-white">{fallback.label}</Text>
      </LinearGradient>
    );
  }

  return (
    <View className={cn(TILE_CLASS, "items-center justify-center gap-1 border border-border", className)}>
      <Ionicons name={icon} size={20} color={THEME[resolved].mutedForeground} />
    </View>
  );
}
