import React from "react";
import { ActivityIndicator, RefreshControl, View } from "react-native";
import Animated from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import type { Memory } from "@/lib/memories";
import { MemoryListItem } from "@/components/MemoryListItem";
import { Text } from "@/components/ui/text";

interface MemoryListProps {
  items: Memory[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  error: string | null;
  onRefresh: () => void;
  onEndReached: () => void;
  onToggleFavorite?: (item: Memory) => void;
  trailingAction?: { icon: keyof typeof Ionicons.glyphMap; onPress: (item: Memory) => void };
  emptyTitle: string;
  emptyHint?: string;
  ListHeaderComponent?: React.ReactElement;
  onScroll?: any;
  scrollEventThrottle?: number;
}

export function MemoryList({
  items,
  loading,
  refreshing,
  loadingMore,
  error,
  onRefresh,
  onEndReached,
  onToggleFavorite,
  trailingAction,
  emptyTitle,
  emptyHint,
  ListHeaderComponent,
  onScroll,
  scrollEventThrottle = 16,
}: MemoryListProps) {
  if (loading) {
    return <ActivityIndicator style={{ marginTop: 40 }} />;
  }

  return (
    <Animated.FlatList
      data={items}
      keyExtractor={(item: Memory) => item.id}
      contentContainerClassName="flex-grow p-4"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      onEndReachedThreshold={0.4}
      onEndReached={onEndReached}
      ListHeaderComponent={ListHeaderComponent}
      onScroll={onScroll}
      scrollEventThrottle={scrollEventThrottle}
      ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} /> : null}
      ListEmptyComponent={
        <>
          <Text className="mt-10 text-center text-sm font-semibold text-muted-foreground">{error ?? emptyTitle}</Text>
          {!error && emptyHint && <Text className="mt-1.5 px-6 text-center text-xs text-muted-foreground">{emptyHint}</Text>}
        </>
      }
      renderItem={({ item }) => (
        <MemoryListItem item={item as Memory} onToggleFavorite={onToggleFavorite} trailingAction={trailingAction} />
      )}
      ItemSeparatorComponent={() => <View className="h-2.5" />}
    />
  );
}
