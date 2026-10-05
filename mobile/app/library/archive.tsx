import React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/ScreenHeader";
import { MemoryList } from "@/components/MemoryList";
import { useMemoryList } from "@/hooks/useMemoryList";
import { updateMemory } from "@/lib/memories";

export default function ArchiveScreen() {
  const { items, loading, refreshing, loadingMore, error, refresh, loadMore, removeItem } = useMemoryList({ isArchived: true });

  const handleUnarchive = async (item: (typeof items)[number]) => {
    removeItem(item.id);
    try {
      await updateMemory(item.id, { isArchived: false });
    } catch {
      refresh();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScreenHeader title="Archive" />
      <View className="flex-1">
        <MemoryList
          items={items}
          loading={loading}
          refreshing={refreshing}
          loadingMore={loadingMore}
          error={error}
          onRefresh={refresh}
          onEndReached={loadMore}
          trailingAction={{ icon: "arrow-undo-outline", onPress: handleUnarchive }}
          emptyTitle="Archive is empty"
          emptyHint="Memories you archive will show up here."
        />
      </View>
    </SafeAreaView>
  );
}
