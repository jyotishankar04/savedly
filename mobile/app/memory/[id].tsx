import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Linking, Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { LinearGradient } from "@/components/ui/linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ActionSheet, type ActionSheetAction } from "@/components/ActionSheet";
import { CollectionPickerModal } from "@/components/CollectionPickerModal";
import { deleteMemory, getMemory, updateMemory, type MemoryDetail } from "@/lib/memories";
import { MEMORY_TYPE_ICONS, MEMORY_TYPE_LABELS, getPlatformFallback } from "@/lib/memoryDisplay";
import { formatFileSize, formatRelativeDate } from "@/lib/format";
import { Text } from "@/components/ui/text";
import { THEME } from "@/lib/theme";

export default function MemoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const resolved = colorScheme ?? "light";

  const [memory, setMemory] = useState<MemoryDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [collectionsVisible, setCollectionsVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const detail = await getMemory(id);
      setMemory(detail);
      setNoteDraft(detail.content ?? "");
    } catch {
      setError("Couldn't load this memory.");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const applyPatch = async (patch: Parameters<typeof updateMemory>[1]) => {
    if (!memory) return;
    const previous = memory;
    setMemory({ ...memory, ...patch } as MemoryDetail);
    try {
      const updated = await updateMemory(memory.id, patch);
      setMemory(updated);
    } catch {
      setMemory(previous);
      Alert.alert("Something went wrong", "That change couldn't be saved. Please try again.");
    }
  };

  const handleSaveNote = async () => {
    if (!memory || noteDraft === memory.content) return;
    setSavingNote(true);
    try {
      const updated = await updateMemory(memory.id, { content: noteDraft });
      setMemory(updated);
    } catch {
      Alert.alert("Couldn't save", "Please try again.");
    } finally {
      setSavingNote(false);
    }
  };

  const handleToggleCollection = async (collectionId: string) => {
    if (!memory) return;
    const current = memory.collections.map((c) => c.id);
    const next = current.includes(collectionId) ? current.filter((c) => c !== collectionId) : [...current, collectionId];
    await applyPatch({ collectionIds: next });
  };

  const handleDeletePermanently = () => {
    if (!memory) return;
    Alert.alert("Delete permanently", "This memory will be permanently deleted. This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteMemory(memory.id);
          router.back();
        },
      },
    ]);
  };

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <ScreenHeader title="Memory" />
        <Text className="mt-10 text-center text-muted-foreground">{error}</Text>
      </SafeAreaView>
    );
  }

  if (!memory) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <ScreenHeader title="Memory" />
        <ActivityIndicator style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  const actions: ActionSheetAction[] = [
    { label: "Add to collection", icon: "folder-outline", onPress: () => setCollectionsVisible(true) },
    memory.inTrash
      ? { label: "Restore from trash", icon: "arrow-undo-outline", onPress: () => applyPatch({ inTrash: false }) }
      : { label: "Move to trash", icon: "trash-outline", onPress: () => applyPatch({ inTrash: true }) },
    memory.isArchived
      ? { label: "Unarchive", icon: "archive-outline", onPress: () => applyPatch({ isArchived: false }) }
      : { label: "Archive", icon: "archive-outline", onPress: () => applyPatch({ isArchived: true }) },
    ...(memory.inTrash
      ? [{ label: "Delete permanently", icon: "warning-outline" as const, destructive: true, onPress: handleDeletePermanently }]
      : []),
  ];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScreenHeader
        title={MEMORY_TYPE_LABELS[memory.type]}
        right={
          <>
            <Pressable hitSlop={8} onPress={() => applyPatch({ isFavorite: !memory.isFavorite })}>
              <Ionicons
                name={memory.isFavorite ? "star" : "star-outline"}
                size={20}
                color={memory.isFavorite ? "#F59E0B" : THEME[resolved].foreground}
              />
            </Pressable>
            <Pressable hitSlop={8} onPress={() => setActionsVisible(true)}>
              <Ionicons name="ellipsis-horizontal" size={20} color={THEME[resolved].foreground} />
            </Pressable>
          </>
        }
      />

      <ScrollView contentContainerClassName="gap-3 p-4 pt-1">
        <PreviewTile memory={memory} />

        {memory.url && (
          <Pressable className="flex-row items-center gap-1.5" onPress={() => Linking.openURL(memory.url!)}>
            <Ionicons name="open-outline" size={14} color={THEME[resolved].primary} />
            <Text className="shrink text-xs text-primary" numberOfLines={1}>
              {memory.canonicalUrl ?? memory.url}
            </Text>
          </Pressable>
        )}

        <Text className="text-xl font-bold">{memory.title || "Untitled"}</Text>

        {memory.type === "note" && (
          <View className="gap-2 rounded-xl border border-border bg-card p-3">
            <TextInput
              className="min-h-20 text-[15px] text-foreground"
              style={{ textAlignVertical: "top" }}
              value={noteDraft}
              onChangeText={setNoteDraft}
              multiline
              placeholder="Write your note..."
              placeholderTextColor={THEME[resolved].mutedForeground}
              onBlur={handleSaveNote}
            />
            {savingNote && <ActivityIndicator size="small" style={{ marginTop: 8 }} />}
          </View>
        )}

        {memory.attachments.length > 0 && (
          <View className="gap-2 border-t border-border pt-2">
            <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Attachments</Text>
            {memory.attachments.map((attachment) => {
              const isImage = attachment.mimeType?.startsWith("image/");
              return (
                <Pressable key={attachment.id} className="flex-row items-center gap-2.5 py-1.5" onPress={() => isImage ? setPreviewImage(attachment.fileUrl) : Linking.openURL(attachment.fileUrl)}>
                  {isImage ? (
                    <Image source={{ uri: attachment.fileUrl }} className="h-11 w-11 rounded-lg bg-muted" />
                  ) : (
                    <View className="h-11 w-11 items-center justify-center rounded-lg border border-border bg-muted">
                      <Ionicons name="document-outline" size={18} color={THEME[resolved].mutedForeground} />
                    </View>
                  )}
                  <View className="flex-1">
                    <Text className="text-[13px] font-semibold" numberOfLines={1}>
                      {attachment.fileUrl.split("/").pop()}
                    </Text>
                    <Text className="text-[11px] text-muted-foreground">
                      {[attachment.mimeType, formatFileSize(attachment.fileSize)].filter(Boolean).join(" · ")}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <View className="gap-2 border-t border-border pt-2">
          <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">AI understood</Text>
          {memory.description ? (
            <Text className="text-sm leading-5 text-muted-foreground">{memory.description}</Text>
          ) : (
            <Text className="text-[13px] text-muted-foreground">
              {memory.status === "processing" ? "Still processing…" : "No description available."}
            </Text>
          )}

          {memory.tags.length > 0 && (
            <View className="flex-row flex-wrap gap-2">
              {memory.tags.map((tag) => (
                <Pressable
                  key={tag}
                  className="rounded-full bg-muted px-2.5 py-1.5 "
                  onPress={() => router.push(`/library/tags/${tag}`)}
                >
                  <Text className="text-xs font-semibold text-primary">#{tag}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {memory.collections.length > 0 && (
            <View className="flex-row flex-wrap gap-2">
              {memory.collections.map((collection) => (
                <Pressable
                  key={collection.id}
                  className="flex-row items-center gap-1 rounded-full bg-muted px-2.5 py-1.5"
                  onPress={() => router.push(`/library/collections/${collection.id}`)}
                >
                  <Ionicons name="folder-outline" size={12} color={THEME[resolved].foreground} />
                  <Text className="text-xs font-semibold">{collection.name}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <Text className="mt-1 text-xs text-muted-foreground">Captured {formatRelativeDate(memory.createdAt)}</Text>
        </View>
      </ScrollView>

      <ActionSheet visible={actionsVisible} onClose={() => setActionsVisible(false)} actions={actions} />
      <CollectionPickerModal
        visible={collectionsVisible}
        selectedIds={memory.collections.map((c) => c.id)}
        onClose={() => setCollectionsVisible(false)}
        onToggle={handleToggleCollection}
      />
      <Modal visible={!!previewImage} transparent={true} animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <View className="flex-1 bg-black/90 justify-center items-center">
          <Pressable className="absolute top-12 right-6 z-10 p-2" onPress={() => setPreviewImage(null)}>
            <Ionicons name="close" size={32} color="#fff" />
          </Pressable>
          {previewImage && (
            <Image source={{ uri: previewImage }} className="w-full h-full" resizeMode="contain" />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function PreviewTile({ memory }: { memory: MemoryDetail }) {
  const [failed, setFailed] = useState(false);
  const icon = MEMORY_TYPE_ICONS[memory.type];
  const { colorScheme } = useColorScheme();
  const resolved = colorScheme ?? "light";

  if (memory.type === "note") {
    return (
      <View className="min-h-[140px] w-full justify-center rounded-2xl bg-amber-100 p-4 dark:bg-amber-950">
        <Text className="text-[15px] leading-[21px] text-amber-900 dark:text-amber-100" numberOfLines={8}>
          {memory.content || "Empty note"}
        </Text>
      </View>
    );
  }

  if (memory.previewImageUrl && !failed) {
    return (
      <Image
        source={{ uri: memory.previewImageUrl }}
        className="aspect-video w-full rounded-2xl bg-muted"
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    );
  }

  if (memory.platform) {
    const fallback = getPlatformFallback(memory.platform);
    return (
      <LinearGradient colors={fallback.colors} className="aspect-video w-full items-center justify-center gap-1.5 rounded-2xl">
        <Ionicons name={icon} size={32} color="#fff" />
        <Text className="text-xs font-bold text-white">{fallback.label}</Text>
      </LinearGradient>
    );
  }

  return (
    <View className="aspect-video w-full items-center justify-center gap-1.5 rounded-2xl border border-border bg-muted">
      <Ionicons name={icon} size={32} color={THEME[resolved].mutedForeground} />
    </View>
  );
}
