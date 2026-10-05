import React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";

// Mirrors client/app/(platfrom)/app/settings/billing — static, no backend
// billing yet on web either.
export default function BillingSettingsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScreenHeader title="Billing" />
      <View className="gap-3 px-4">
        <View className="gap-2 rounded-xl border border-border bg-card p-4">
          <Text className="text-xs font-bold tracking-wide text-muted-foreground">FREE TIER</Text>
          <Text className="text-[15px] font-semibold">500 / 500 memories used</Text>
          <View className="h-1.5 overflow-hidden rounded-full bg-border">
            <View className="h-full w-full bg-foreground" />
          </View>
        </View>

        <Text className="mt-2 text-xs font-bold uppercase text-muted-foreground">Pro includes</Text>
        {["Unlimited memories", "Priority AI processing", "Advanced search", "Priority support"].map((feature) => (
          <Text key={feature} className="text-sm text-muted-foreground">
            • {feature}
          </Text>
        ))}

        <Button disabled className="mt-3 bg-muted">
          <Text className="font-semibold text-muted-foreground">Upgrade to Pro — Coming soon</Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}
