import React from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import type { Memory } from "@/lib/memories";
import { MEMORY_TYPE_LABELS } from "@/lib/memoryDisplay";
import { formatRelativeDate } from "@/lib/format";
import { MemoryThumbnail } from "@/components/MemoryThumbnail";
import { Text } from "@/components/ui/text";
import { THEME } from "@/lib/theme";

interface MemoryListItemProps {
  item: Memory;
  onToggleFavorite?: (item: Memory) => void;
  /** Trash rows swap the favorite star for a restore action. */
  trailingAction?: { icon: keyof typeof Ionicons.glyphMap; onPress: (item: Memory) => void };
}

export function MemoryListItem({ item, onToggleFavorite, trailingAction }: MemoryListItemProps) {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const resolved = colorScheme ?? "light";

  return (
    <Pressable
      className="flex-row items-start gap-2.5 rounded-xl border border-border bg-card p-2.5 shadow-sm"
      onPress={() => router.push(`/memory/${item.id}`)}
    >
      <MemoryThumbnail item={item} className="w-[84px]" />
      <View className="flex-1 gap-0.5">
        <View className="flex-row justify-between">
          <Text className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {MEMORY_TYPE_LABELS[item.type]}
          </Text>
          <Text className="text-[10px] text-muted-foreground">{formatRelativeDate(item.createdAt)}</Text>
        </View>
        <Text className="text-sm font-semibold" numberOfLines={2}>
          {item.title || item.url || "Untitled"}
        </Text>
        {item.description && (
          <Text className="text-xs text-muted-foreground" numberOfLines={2}>
            {item.description}
          </Text>
        )}
        {item.tags.length > 0 && (
          <View className="mt-0.5 flex-row flex-wrap gap-1">
            {item.tags.slice(0, 3).map((tag) => (
              <View key={tag} className="rounded-full bg-muted px-1.5 py-0.5 ">
                <Text className="text-[10px] font-semibold text-primary">{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      {trailingAction ? (
        <Pressable hitSlop={10} onPress={() => trailingAction.onPress(item)} className="p-1">
          <Ionicons name={trailingAction.icon} size={20} color={THEME[resolved].foreground} />
        </Pressable>
      ) : onToggleFavorite ? (
        <Pressable hitSlop={10} onPress={() => onToggleFavorite(item)} className="p-1">
          <Ionicons
            name={item.isFavorite ? "star" : "star-outline"}
            size={20}
            color={item.isFavorite ? "#F59E0B" : THEME[resolved].mutedForeground}
          />
        </Pressable>
      ) : null}
    </Pressable>
  );
}
