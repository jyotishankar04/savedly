import React from "react";
import { Modal, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { Text } from "@/components/ui/text";
import { THEME } from "@/lib/theme";
import { cn } from "@/lib/utils";

export interface ActionSheetAction {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  onPress: () => void;
}

export function ActionSheet({ visible, onClose, actions }: { visible: boolean; onClose: () => void; actions: ActionSheetAction[] }) {
  const { colorScheme } = useColorScheme();
  const resolved = colorScheme ?? "light";
  const destructiveColor = THEME[resolved].destructive;
  const foregroundColor = THEME[resolved].foreground;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <View className="rounded-t-[20px] bg-card pb-7 pt-2">
          {actions.map((action) => (
            <Pressable
              key={action.label}
              className="flex-row items-center gap-3 px-5 py-3.5"
              onPress={() => {
                onClose();
                action.onPress();
              }}
            >
              <Ionicons name={action.icon} size={19} color={action.destructive ? destructiveColor : foregroundColor} />
              <Text className={cn("text-[15px] font-medium", action.destructive && "text-destructive")}>{action.label}</Text>
            </Pressable>
          ))}
          <Pressable className="mt-1 flex-row justify-center border-t border-border px-5 py-3.5" onPress={onClose}>
            <Text className="text-[15px] font-semibold text-muted-foreground">Cancel</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
