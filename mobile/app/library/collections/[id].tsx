import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { ScreenHeader } from "@/components/ScreenHeader";
import { MemoryList } from "@/components/MemoryList";
import { PromptModal } from "@/components/PromptModal";
import { useMemoryList } from "@/hooks/useMemoryList";
import { updateMemory } from "@/lib/memories";
import { deleteCollection, listCollections, updateCollection, type Collection } from "@/lib/collections";
import { THEME } from "@/lib/theme";

export default function CollectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [showRename, setShowRename] = useState(false);
  const { colorScheme } = useColorScheme();
  const resolved = colorScheme ?? "light";

  const loadCollection = useCallback(async () => {
    const all = await listCollections();
    setCollection(all.find((c) => c.id === id) ?? null);
  }, [id]);

  useEffect(() => {
    loadCollection();
  }, [loadCollection]);

  const { items, loading, refreshing, loadingMore, error, refresh, loadMore, patchItem } = useMemoryList({ collectionId: id });

  const handleToggleFavorite = async (item: (typeof items)[number]) => {
    patchItem(item.id, { isFavorite: !item.isFavorite });
    try {
      await updateMemory(item.id, { isFavorite: !item.isFavorite });
    } catch {
      patchItem(item.id, { isFavorite: item.isFavorite });
    }
  };

  const handleRename = async (name: string) => {
    await updateCollection(id, { name });
    setShowRename(false);
    await loadCollection();
  };

  const handleDelete = () => {
    Alert.alert("Delete collection", `Delete "${collection?.name}"? Memories inside it won't be deleted.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteCollection(id);
          router.back();
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScreenHeader
        title={collection?.name ?? "Collection"}
        right={
          <>
            <Pressable hitSlop={8} onPress={() => setShowRename(true)}>
              <Ionicons name="pencil-outline" size={18} color={THEME[resolved].foreground} />
            </Pressable>
            <Pressable hitSlop={8} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color={THEME[resolved].destructive} />
            </Pressable>
          </>
        }
      />
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
          emptyTitle="No memories in this collection yet"
        />
      </View>

      <PromptModal
        visible={showRename}
        title="Rename collection"
        placeholder="Collection name"
        initialValue={collection?.name}
        onCancel={() => setShowRename(false)}
        onSubmit={handleRename}
      />
    </SafeAreaView>
  );
}
