import React from "react";
import { View } from "react-native";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";

export function ToggleRow({
  label,
  description,
  value,
  onValueChange,
  disabled,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View className="flex-row items-center gap-3 border-b border-border py-3.5">
      <View className="flex-1">
        <Text className="text-sm font-semibold">{label}</Text>
        {description && <Text className="mt-0.5 text-xs text-muted-foreground">{description}</Text>}
      </View>
      <Switch checked={value} onCheckedChange={onValueChange} disabled={disabled} />
    </View>
  );
}
