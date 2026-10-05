import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { listCollections, createCollection, type Collection } from "@/lib/collections";
import { listTags, type Tag } from "@/lib/tags";
import { PromptModal } from "@/components/PromptModal";
import { Text } from "@/components/ui/text";
import { THEME } from "@/lib/theme";

const QUICK_LINKS: { href: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { href: "/library/favorites", label: "Favorites", icon: "star-outline" },
  { href: "/library/archive", label: "Archive", icon: "archive-outline" },
  { href: "/library/trash", label: "Trash", icon: "trash-outline" },
];

export default function LibraryScreen() {
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[] | null>(null);
  const [tags, setTags] = useState<Tag[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewCollection, setShowNewCollection] = useState(false);
  const { colorScheme } = useColorScheme();
  const resolved = colorScheme ?? "light";

  const load = useCallback(async () => {
    try {
      const [c, t] = await Promise.all([listCollections(), listTags()]);
      setCollections(c);
      setTags(t);
    } catch {
      setCollections([]);
      setTags([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleCreateCollection = async (name: string) => {
    await createCollection({ name });
    setShowNewCollection(false);
    await load();
  };

  const loading = collections === null || tags === null;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <Text className="px-5 pt-4 text-3xl font-bold tracking-tight">Library</Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerClassName="gap-2 p-4"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View className="mb-3 flex-row gap-2.5">
            {QUICK_LINKS.map((link) => (
              <Pressable
                key={link.href}
                className="flex-1 items-center gap-1.5 rounded-xl border border-border bg-card py-3.5 shadow-sm"
                onPress={() => router.push(link.href as never)}
              >
                <Ionicons name={link.icon} size={20} color={THEME[resolved].foreground} />
                <Text className="text-xs font-semibold">{link.label}</Text>
              </Pressable>
            ))}
          </View>

          <View className="mb-1 mt-4 flex-row items-center justify-between">
            <Text className="text-[15px] font-bold">Collections</Text>
            <Pressable onPress={() => setShowNewCollection(true)} hitSlop={8}>
              <Ionicons name="add-circle-outline" size={20} color={THEME[resolved].foreground} />
            </Pressable>
          </View>
          {collections!.length === 0 ? (
            <Text className="py-2 text-sm text-muted-foreground">No collections yet.</Text>
          ) : (
            collections!.map((collection) => (
              <Pressable
                key={collection.id}
                className="flex-row items-center gap-2.5 border-b border-border py-3"
                onPress={() => router.push(`/library/collections/${collection.id}`)}
              >
                <Ionicons name="folder-outline" size={18} color={THEME[resolved].mutedForeground} />
                <Text className="flex-1 text-sm font-medium" numberOfLines={1}>
                  {collection.name}
                </Text>
                <Text className="text-xs text-muted-foreground">{collection.memoryCount}</Text>
              </Pressable>
            ))
          )}

          <View className="mb-1 mt-4 flex-row items-center justify-between">
            <Text className="text-[15px] font-bold">Tags</Text>
          </View>
          {tags!.length === 0 ? (
            <Text className="py-2 text-sm text-muted-foreground">No tags yet.</Text>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {tags!.map((tag) => (
                <Pressable
                  key={tag.id}
                  className="rounded-full bg-muted px-2.5 py-1.5 "
                  onPress={() => router.push(`/library/tags/${tag.name}`)}
                >
                  <Text className="text-xs font-semibold text-primary">
                    {tag.name} · {tag.memoryCount}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <PromptModal
        visible={showNewCollection}
        title="New collection"
        placeholder="Collection name"
        submitLabel="Create"
        onCancel={() => setShowNewCollection(false)}
        onSubmit={handleCreateCollection}
      />
    </SafeAreaView>
  );
}
