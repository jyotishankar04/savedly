import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { createMemory, type MemoryType } from "@/lib/memories";
import { uploadLocalFile, type UploadedFile } from "@/lib/uploads";
import { listCollections, type Collection } from "@/lib/collections";
import { detectMemoryType, deriveTitle, splitLinkAndCaption } from "@/lib/detectMemoryType";
import { MEMORY_TYPE_ICONS, MEMORY_TYPE_LABELS } from "@/lib/memoryDisplay";
import { formatFileSize } from "@/lib/format";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { ActionSheet, type ActionSheetAction } from "@/components/ActionSheet";
import { CollectionPickerModal } from "@/components/CollectionPickerModal";
import { THEME } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface PendingAttachment {
  localUri: string;
  name: string;
  mimeType: string;
}

export default function CaptureScreen() {
  const { colorScheme } = useColorScheme();
  const resolved = colorScheme ?? "light";

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionIds, setCollectionIds] = useState<string[]>([]);

  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [uploadedAttachment, setUploadedAttachment] = useState<UploadedFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [attachSheetVisible, setAttachSheetVisible] = useState(false);
  const [collectionPickerVisible, setCollectionPickerVisible] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ title: string; collections: { id: string; name: string }[] } | null>(null);

  useEffect(() => {
    listCollections().then(setCollections).catch(() => setCollections([]));
  }, []);

  const toggleCollection = (collectionId: string) =>
    setCollectionIds((prev) => (prev.includes(collectionId) ? prev.filter((id) => id !== collectionId) : [...prev, collectionId]));

  const detectedType = useMemo<MemoryType>(
    () => detectMemoryType({ text, attachmentMimeType: pendingAttachment?.mimeType ?? null }),
    [text, pendingAttachment],
  );

  const selectedCollectionNames = useMemo(
    () =>
      collections
        .filter((c) => collectionIds.includes(c.id))
        .map((c) => c.name)
        .join(", "),
    [collections, collectionIds],
  );

  const resetForm = () => {
    setTitle("");
    setText("");
    setCollectionIds([]);
    setPendingAttachment(null);
    setUploadedAttachment(null);
    setAttachmentError(null);
    setSaveError(null);
    setSaved(null);
  };

  const uploadPicked = async (localUri: string, name: string, mimeType: string) => {
    setPendingAttachment({ localUri, name, mimeType });
    setUploadedAttachment(null);
    setAttachmentError(null);
    setIsUploading(true);
    try {
      const uploaded = await uploadLocalFile(localUri, name, mimeType);
      setUploadedAttachment(uploaded);
    } catch (err) {
      setAttachmentError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setAttachmentError("Photo library access was denied.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await uploadPicked(asset.uri, asset.fileName ?? "photo.jpg", asset.mimeType ?? "image/jpeg");
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/*"] });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await uploadPicked(asset.uri, asset.name, asset.mimeType ?? "application/octet-stream");
  };

  const clearAttachment = () => {
    setPendingAttachment(null);
    setUploadedAttachment(null);
    setAttachmentError(null);
  };

  const attachActions: ActionSheetAction[] = [
    { label: "Photo", icon: "image-outline", onPress: pickPhoto },
    { label: "Document", icon: "document-attach-outline", onPress: pickDocument },
  ];

  const handleSave = async () => {
    if (!text.trim() && !uploadedAttachment) return;
    setSaving(true);
    setSaveError(null);
    try {
      const derivedTitle = title.trim() || deriveTitle(detectedType, text, pendingAttachment?.name);
      const { url: extractedUrl, caption } = splitLinkAndCaption(text);
      const isLink = detectedType === "web" || detectedType === "video";
      const memory = await createMemory({
        type: detectedType,
        title: derivedTitle,
        url: isLink ? extractedUrl?.href : undefined,
        content: detectedType === "note" || uploadedAttachment ? text.trim() || undefined : isLink ? caption || undefined : undefined,
        collectionIds: collectionIds.length > 0 ? collectionIds : undefined,
        attachments: uploadedAttachment ? [uploadedAttachment] : undefined,
        captureMethod: "mobile",
      });
      setSaved({ title: memory.title ?? derivedTitle, collections: memory.collections });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn't save that memory.");
    } finally {
      setSaving(false);
    }
  };

  const canSave = (text.trim().length > 0 || uploadedAttachment !== null) && !isUploading;

  if (saved) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center gap-2 bg-background px-8">
        <View className="mb-2 h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-card">
          <Ionicons name="checkmark" size={28} color="#10b981" />
        </View>
        <Text className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-600">
          Saved to Memora
        </Text>
        <Text className="pt-2 text-center text-2xl font-semibold">{saved.title}</Text>
        {saved.collections.length > 0 && (
          <View className="flex-row flex-wrap justify-center gap-1.5 pt-3">
            {saved.collections.map((c) => (
              <Text key={c.id} className="rounded-full border border-primary/10 bg-muted px-2.5 py-1 text-[10px] font-bold uppercase text-primary">
                {c.name}
              </Text>
            ))}
          </View>
        )}
        <Button className="mt-8 rounded-full px-8" onPress={resetForm}>
          <Text className="font-bold">Capture another</Text>
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView contentContainerClassName="gap-4 p-4" keyboardShouldPersistTaps="handled">
        <View className="mb-2">
          <Text className="text-3xl font-bold tracking-tight">Quick Capture</Text>
          <Text className="mt-1 text-sm text-muted-foreground">Paste a link, attach a file, or just start typing a note.</Text>
        </View>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Untitled memory"
          placeholderTextColor={THEME[resolved].mutedForeground}
          className="text-2xl font-semibold text-foreground"
        />

        <View className="rounded-2xl bg-card border border-border shadow-sm">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Paste a link, or start typing a note..."
            placeholderTextColor={THEME[resolved].mutedForeground}
            className="min-h-[140px] px-4 py-3.5 text-sm text-foreground"
            style={{ textAlignVertical: "top" }}
            multiline
          />

          {(isUploading || uploadedAttachment || attachmentError) && (
            <View className="px-3 pb-2">
              <View
                className={cn(
                  "flex-row items-center gap-2.5 rounded-xl border bg-card p-2",
                  attachmentError ? "border-destructive" : "border-border",
                )}
              >
                {pendingAttachment?.mimeType.startsWith("image/") ? (
                  <Image source={{ uri: uploadedAttachment?.fileUrl ?? pendingAttachment.localUri }} className="h-10 w-10 rounded-lg bg-muted" />
                ) : (
                  <View className="h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted">
                    <Ionicons name="document-outline" size={18} color={THEME[resolved].mutedForeground} />
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-[13px] font-semibold" numberOfLines={1}>
                    {pendingAttachment?.name ?? "Attachment"}
                  </Text>
                  <Text className={cn("text-[11px]", attachmentError ? "text-destructive" : "text-muted-foreground")}>
                    {attachmentError ?? (isUploading ? "Uploading…" : uploadedAttachment ? formatFileSize(uploadedAttachment.fileSize) : "")}
                  </Text>
                </View>
                {isUploading ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <Pressable hitSlop={8} onPress={clearAttachment}>
                    <Ionicons name="close" size={16} color={THEME[resolved].mutedForeground} />
                  </Pressable>
                )}
              </View>
            </View>
          )}

          <View className="flex-row items-center justify-between rounded-b-2xl border-t border-border/20 px-3 py-2.5">
            <Pressable className="flex-row items-center gap-1.5 px-1 py-1" onPress={() => setAttachSheetVisible(true)}>
              <Ionicons name="attach-outline" size={15} color={THEME[resolved].foreground} />
              <Text className="text-xs font-semibold">Attach</Text>
            </Pressable>

            <View className="flex-row items-center gap-1 rounded-full bg-muted px-2.5 py-1">
              <Ionicons name={MEMORY_TYPE_ICONS[detectedType]} size={12} color={THEME[resolved].primary} />
              <Text className="text-[10px] font-bold uppercase tracking-wide text-primary">{MEMORY_TYPE_LABELS[detectedType]}</Text>
            </View>
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Add to</Text>
          <Pressable
            className="h-11 flex-row items-center justify-between rounded-xl bg-card px-3.5"
            onPress={() => setCollectionPickerVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Select collections"
            accessibilityHint={selectedCollectionNames || "No collections selected"}
          >
            <Text className={cn("flex-1 text-[13px]", collectionIds.length === 0 && "text-muted-foreground")} numberOfLines={1}>
              {selectedCollectionNames || "Select a collection…"}
            </Text>
            {collectionIds.length > 0 && (
              <View className="mr-2 h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5">
                <Text className="text-[10px] font-bold text-primary-foreground">{collectionIds.length}</Text>
              </View>
            )}
            <Ionicons name="chevron-down" size={16} color={THEME[resolved].mutedForeground} />
          </Pressable>
        </View>

        {saveError && <Text className="text-xs text-destructive">{saveError}</Text>}

        <View className="flex-row items-center justify-end gap-4 border-t border-border/30 pt-4">
          <Pressable onPress={resetForm}>
            <Text className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Clear</Text>
          </Pressable>
          <Button className="rounded-full px-6" onPress={handleSave} disabled={!canSave || saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="add" size={16} color={THEME[resolved].primaryForeground} />
                <Text className="font-bold">Save Memory</Text>
              </View>
            )}
          </Button>
        </View>
      </ScrollView>

      <ActionSheet visible={attachSheetVisible} onClose={() => setAttachSheetVisible(false)} actions={attachActions} />
      <CollectionPickerModal
        visible={collectionPickerVisible}
        selectedIds={collectionIds}
        onClose={() => setCollectionPickerVisible(false)}
        onToggle={toggleCollection}
        onCreated={(created) => {
          setCollections((prev) => [...prev, created]);
          setCollectionIds((prev) => [...prev, created.id]);
        }}
      />
    </SafeAreaView>
  );
}
