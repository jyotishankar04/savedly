import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useColorScheme } from "nativewind";
import Animated, { useAnimatedScrollHandler, useSharedValue, useAnimatedStyle, interpolate, Extrapolation } from "react-native-reanimated";
import { useMemoryList } from "@/hooks/useMemoryList";
import { MemoryList } from "@/components/MemoryList";
import { updateMemory, type MemoryType } from "@/lib/memories";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { THEME } from "@/lib/theme";

const TYPE_FILTERS: { value: MemoryType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "web", label: "Links" },
  { value: "note", label: "Notes" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
  { value: "document", label: "Docs" },
  { value: "voice", label: "Voice" },
];

export default function MemoriesScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const resolved = colorScheme ?? "light";
  const [typeFilter, setTypeFilter] = useState<MemoryType | "all">("all");
  const { items, loading, refreshing, loadingMore, error, refresh, loadMore, patchItem } = useMemoryList(
    typeFilter === "all" ? {} : { type: typeFilter },
  );

  useFocusEffect(
    React.useCallback(() => {
      refresh();
    }, [refresh])
  );

  const { user } = useAuth();
  const firstName = user?.name ? user.name.split(/\s+/)[0] : "User";
  const hour = new Date().getHours();
  let greeting = "Good evening";
  if (hour < 12) greeting = "Good morning";
  else if (hour < 18) greeting = "Good afternoon";

  const handleToggleFavorite = async (item: (typeof items)[number]) => {
    patchItem(item.id, { isFavorite: !item.isFavorite });
    try {
      await updateMemory(item.id, { isFavorite: !item.isFavorite });
    } catch {
      patchItem(item.id, { isFavorite: item.isFavorite });
    }
  };

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const animatedHeaderStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(scrollY.value, [0, 80], [1, 0], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(scrollY.value, [0, 80], [0, -20], Extrapolation.CLAMP),
        },
      ],
    };
  });

  const renderHeader = () => (
    <View className="mb-2">
      <Animated.View style={animatedHeaderStyle} className="pt-2 pb-2 gap-1 flex-row justify-between items-start">
        <View className="flex-1">
          <Text className="text-3xl font-bold tracking-tight text-foreground">{greeting}, {firstName}.</Text>
          <Text className="text-sm text-muted-foreground font-medium">What's on your mind?</Text>
        </View>
        <Pressable className="p-1 mt-1" onPress={() => router.push("/settings/notifications")}>
          <Ionicons name="notifications-outline" size={24} color={THEME[resolved].foreground} />
          <View className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
        </Pressable>
      </Animated.View>

      <Animated.View style={animatedHeaderStyle}>
        <Pressable 
          className="mt-4 flex-row items-center gap-3 rounded-2xl bg-card border border-border px-4 py-4 shadow-sm" 
          onPress={() => router.push("/search")}
        >
          <Ionicons name="search-outline" size={20} color={THEME[resolved].primary} />
          <Text className="text-sm text-muted-foreground">Search your memory...</Text>
        </Pressable>
      </Animated.View>

      <View className="mt-4 mb-3 flex-row items-center justify-between">
        <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Recent</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-grow-0 pb-2 -mx-4 px-4" contentContainerClassName="gap-2">
        {TYPE_FILTERS.map((filter) => (
          <Pressable
            key={filter.value}
            className={cn("rounded-full border px-4 py-2", typeFilter === filter.value ? "bg-primary border-primary" : "bg-card border-border")}
            onPress={() => setTypeFilter(filter.value)}
          >
            <Text className={cn("text-xs font-semibold", typeFilter === filter.value ? "text-primary-foreground" : "text-foreground")}>
              {filter.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
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
          emptyTitle="Nothing saved yet"
          emptyHint="Share or screenshot something to get started."
          ListHeaderComponent={renderHeader()}
          onScroll={scrollHandler}
        />
      </View>
    </SafeAreaView>
  );
}
