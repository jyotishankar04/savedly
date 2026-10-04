import React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/ScreenHeader";
import { MemoryList } from "@/components/MemoryList";
import { useMemoryList } from "@/hooks/useMemoryList";
import { updateMemory } from "@/lib/memories";

export default function FavoritesScreen() {
  const { items, loading, refreshing, loadingMore, error, refresh, loadMore, patchItem } = useMemoryList({ isFavorite: true });

  const handleToggleFavorite = async (item: (typeof items)[number]) => {
    patchItem(item.id, { isFavorite: !item.isFavorite });
    try {
      await updateMemory(item.id, { isFavorite: !item.isFavorite });
    } catch {
      patchItem(item.id, { isFavorite: item.isFavorite });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScreenHeader title="Favorites" />
      <View className="flex-1">
        <MemoryList
          items={items}
          loading={loading}
          refreshing={refreshing}
          loadingMore={loadingMore}
          error={error}
          onRefresh={refresh}
          onEndReached={loadMore}
          onToggleFavorite={handleToggleFavorite}
          emptyTitle="No favorites yet"
          emptyHint="Tap the star on any memory to pin it here."
        />
      </View>
    </SafeAreaView>
  );
}
