import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useMemoryList } from "@/hooks/useMemoryList";
import { MemoryList } from "@/components/MemoryList";
import { updateMemory } from "@/lib/memories";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { THEME } from "@/lib/theme";

export default function SearchScreen() {
  const { colorScheme } = useColorScheme();
  const resolved = colorScheme ?? "light";
  const [text, setText] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setDebounced(text.trim()), 300);
    return () => clearTimeout(id);
  }, [text]);

  const { items, loading, refreshing, loadingMore, error, refresh, loadMore, patchItem } = useMemoryList(
    { q: debounced },
    { enabled: debounced.length > 0 },
  );

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
      <Text className="px-5 pt-4 text-3xl font-bold tracking-tight">Search</Text>
      <View className="mx-5 mt-4 mb-2 flex-row items-center gap-3 rounded-2xl bg-card border border-border px-4 py-2 shadow-sm">
        <Ionicons name="search-outline" size={20} color={THEME[resolved].primary} />
        <Input
          className="flex-1 border-0 bg-transparent px-0 shadow-none text-base"
          placeholder="Ask in plain language..."
          value={text}
          onChangeText={setText}
          autoFocus
          returnKeyType="search"
          placeholderTextColor={THEME[resolved].mutedForeground}
        />
      </View>

      <View className="mt-2 flex-1">
        {debounced.length === 0 ? (
          <View className="mt-16 items-center gap-1.5 px-8">
            <Ionicons name="sparkles-outline" size={28} color={THEME[resolved].border} />
            <Text className="mt-2 text-sm font-semibold text-foreground">Search everything you've saved</Text>
            <Text className="text-center text-xs text-muted-foreground">
              Try "that article about pricing" or "recipes I saved last month."
            </Text>
          </View>
        ) : (
          <MemoryList
            items={items}
            loading={loading}
            refreshing={refreshing}
            loadingMore={loadingMore}
            error={error}
            onRefresh={refresh}
            onEndReached={loadMore}
            onToggleFavorite={handleToggleFavorite}
            emptyTitle="No results"
            emptyHint="Try a different phrase or keyword."
          />
        )}
      </View>
    </SafeAreaView>
  );
}
