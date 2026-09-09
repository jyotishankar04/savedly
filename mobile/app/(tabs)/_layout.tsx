import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { THEME } from "@/lib/theme";

export default function TabsLayout() {
  const { colorScheme } = useColorScheme();
  const resolved = colorScheme ?? "light";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: THEME[resolved].primary,
        tabBarInactiveTintColor: THEME[resolved].mutedForeground,
        tabBarStyle: { backgroundColor: THEME[resolved].background, borderTopColor: THEME[resolved].border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Memories", tabBarIcon: ({ color, size }) => <Ionicons name="albums-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="ask"
        options={{ title: "Ask", tabBarIcon: ({ color, size }) => <Ionicons name="sparkles-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="search"
        options={{ title: "Search", tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="capture"
        options={{ title: "Capture", tabBarIcon: ({ color, size }) => <Ionicons name="add-circle-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="library"
        options={{ title: "Library", tabBarIcon: ({ color, size }) => <Ionicons name="folder-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: "Settings", tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} /> }}
      />
    </Tabs>
  );
}
