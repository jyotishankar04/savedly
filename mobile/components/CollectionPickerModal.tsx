import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { createCollection, listCollections, type Collection } from "@/lib/collections";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { PromptModal } from "@/components/PromptModal";
import { THEME } from "@/lib/theme";

interface CollectionPickerModalProps {
  visible: boolean;
  selectedIds: string[];
  onClose: () => void;
  onToggle: (collectionId: string) => void;
  /** Called when a new collection is created from inside the picker, so the caller can auto-select it. */
  onCreated?: (collection: Collection) => void;
}

export function CollectionPickerModal({ visible, selectedIds, onClose, onToggle, onCreated }: CollectionPickerModalProps) {
  const [collections, setCollections] = useState<Collection[] | null>(null);
  const [showNewCollection, setShowNewCollection] = useState(false);
  const { colorScheme } = useColorScheme();
  const resolved = colorScheme ?? "light";
  const { height: windowHeight } = useWindowDimensions();

  const loadCollections = () => {
    listCollections().then(setCollections).catch(() => setCollections([]));
  };

  useEffect(() => {
    if (visible) loadCollections();
  }, [visible]);

  const handleCreateCollection = async (name: string) => {
    const created = await createCollection({ name });
    setShowNewCollection(false);
    loadCollections();
    onCreated?.(created);
  };

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-2">
        <DialogTitle>Add to collection</DialogTitle>
        {collections === null ? (
          <ActivityIndicator style={{ marginVertical: 24 }} />
        ) : (
          <ScrollView
            style={{ height: Math.min(windowHeight * 0.45, collections.length * 52 + 52) }}
            showsVerticalScrollIndicator={false}
          >
            {collections.length === 0 && <Text className="py-2 text-sm text-muted-foreground">No collections yet.</Text>}
            {collections.map((collection) => {
              const selected = selectedIds.includes(collection.id);
              return (
                <Pressable
                  key={collection.id}
                  className="flex-row items-center justify-between border-b border-border py-3"
                  onPress={() => onToggle(collection.id)}
                >
                  <Text className="text-[15px]">{collection.name}</Text>
                  <Ionicons
                    name={selected ? "checkmark-circle" : "ellipse-outline"}
                    size={20}
                    color={selected ? THEME[resolved].foreground : THEME[resolved].mutedForeground}
                  />
                </Pressable>
              );
            })}
            <Pressable className="flex-row items-center gap-2 py-3" onPress={() => setShowNewCollection(true)}>
              <Ionicons name="add-circle-outline" size={20} color={THEME[resolved].primary} />
              <Text className="text-[15px] font-semibold text-primary">New collection</Text>
            </Pressable>
          </ScrollView>
        )}
        <DialogFooter className="flex-row">
          <Button className="flex-1" onPress={onClose}>
            <Text>Done</Text>
          </Button>
        </DialogFooter>
      </DialogContent>

      <PromptModal
        visible={showNewCollection}
        title="New collection"
        placeholder="Collection name"
        submitLabel="Create"
        onCancel={() => setShowNewCollection(false)}
        onSubmit={handleCreateCollection}
      />
    </Dialog>
  );
}
