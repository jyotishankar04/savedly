import React from "react";
import { Linking, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { THEME } from "@/lib/theme";

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? "http://localhost:3000";

// Live streaming to a native chat UI hit a real, deeper issue: assistant
// replies from the RAG graph's front-desk "decline" path (an off-topic or
// small-talk query) come back with an empty parts array on the client even
// though the server generates and logs real completion tokens for them —
// something in how that path's turn reaches the client's UI message stream,
// not the auth/streaming-transport bugs already fixed in lib/ai.ts. Gating
// the screen here rather than shipping a chat UI that silently drops replies.
export default function AskScreen() {
  const { colorScheme } = useColorScheme();
  const resolved = colorScheme ?? "light";

  return (
    <SafeAreaView className="flex-1 items-center justify-center gap-2 bg-background px-8" edges={["top"]}>
      <View className="mb-2 h-16 w-16 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20">
        <Ionicons name="sparkles" size={32} color={THEME[resolved].primary} />
      </View>
      <Text className="rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Coming soon
      </Text>
      <Text className="mt-2 text-center text-lg font-bold">Ask AI isn't ready on mobile yet</Text>
      <Text className="max-w-[280px] text-center text-sm text-muted-foreground">
        It's available on the web right now — head there to ask about your memories.
      </Text>
      <Button className="mt-6 rounded-full px-6" onPress={() => Linking.openURL(`${WEB_URL}/app/ask`)}>
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="open-outline" size={16} color={THEME[resolved].primaryForeground} />
          <Text className="font-bold">Try it on the web</Text>
        </View>
      </Button>
    </SafeAreaView>
  );
}
