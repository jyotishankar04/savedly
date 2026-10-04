import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useShareIntentContext } from "expo-share-intent";
import { apiFetch } from "@/lib/api";
import { uploadLocalFile } from "@/lib/uploads";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function looksLikeUrl(text: string): boolean {
  try {
    const url = new URL(text.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

type PendingCapture =
  | { kind: "text"; text: string }
  | { kind: "file"; localUri: string; filename: string; mimeType: string };

export default function CaptureConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string; localUri?: string; filename?: string }>();
  const { shareIntent, resetShareIntent } = useShareIntentContext();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");

  // What's being captured, resolved once from either the share-intent
  // context (source: "share-intent") or the route params a screenshot save
  // handed over (source: "screenshot") — the two entry points funnel into
  // this one screen deliberately, so there's a single capture code path.
  const pending = useMemo<PendingCapture | null>(() => {
    if (params.source === "screenshot" && params.localUri) {
      return { kind: "file", localUri: params.localUri, filename: params.filename ?? "screenshot.png", mimeType: "image/png" };
    }
    if (params.source === "share-intent") {
      const file = shareIntent.files?.[0];
      if (file) {
        return { kind: "file", localUri: file.path, filename: file.fileName, mimeType: file.mimeType };
      }
      const text = shareIntent.webUrl ?? shareIntent.text;
      if (text) {
        return { kind: "text", text };
      }
    }
    return null;
  }, [params, shareIntent]);

  useEffect(() => {
    if (pending?.kind === "text" && looksLikeUrl(pending.text)) {
      setTitle(pending.text);
    }
  }, [pending]);

  const cleanupAndClose = () => {
    if (params.source === "share-intent") resetShareIntent();
    router.back();
  };

  const handleSave = async () => {
    if (!pending) return;
    setSaving(true);
    setError(null);
    try {
      if (pending.kind === "file") {
        const uploaded = await uploadLocalFile(pending.localUri, pending.filename, pending.mimeType);
        const isImage = pending.mimeType.startsWith("image/");
        await apiFetch("/memories", {
          method: "POST",
          body: {
            type: isImage ? "image" : "document",
            title: title.trim() || pending.filename,
            attachments: [uploaded],
            captureMethod: "mobile",
          },
        });
      } else {
        const isUrl = looksLikeUrl(pending.text);
        await apiFetch("/memories", {
          method: "POST",
          body: {
            type: isUrl ? "web" : "note",
            url: isUrl ? pending.text : undefined,
            content: isUrl ? undefined : pending.text,
            title: title.trim() || undefined,
            captureMethod: "mobile",
          },
        });
      }
      cleanupAndClose();
    } catch {
      setError("Couldn't save that. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!pending) {
    return (
      <SafeAreaView className="flex-1 gap-3 bg-background p-4">
        <Text className="mt-10 text-center text-muted-foreground">Nothing to save.</Text>
        <Button variant="outline" className="rounded-full" onPress={cleanupAndClose}>
          <Text className="font-semibold">Close</Text>
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 gap-3 bg-background p-4">
      <Text className="text-xl font-bold">Save to Memora</Text>

      {pending.kind === "file" && pending.mimeType.startsWith("image/") && (
        <Image source={{ uri: pending.localUri }} className="h-[220px] w-full rounded-xl bg-muted" resizeMode="cover" />
      )}
      {pending.kind === "text" && (
        <View className="rounded-xl border border-border bg-card p-3.5">
          <Text className="text-sm" numberOfLines={6}>
            {pending.text}
          </Text>
        </View>
      )}

      <Input placeholder="Title (optional)" value={title} onChangeText={setTitle} />

      {error && <Text className="text-sm text-destructive">{error}</Text>}

      <View className="mt-auto flex-row gap-3">
        <Button variant="outline" className="flex-1 rounded-full" onPress={cleanupAndClose} disabled={saving}>
          <Text className="font-semibold">Cancel</Text>
        </Button>
        <Button className="flex-1 rounded-full" onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text className="font-semibold">Save</Text>}
        </Button>
      </View>
    </SafeAreaView>
  );
}
