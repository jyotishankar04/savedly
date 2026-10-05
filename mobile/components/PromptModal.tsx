import React, { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";

interface PromptModalProps {
  visible: boolean;
  title: string;
  placeholder?: string;
  initialValue?: string;
  submitLabel?: string;
  onCancel: () => void;
  onSubmit: (value: string) => Promise<void> | void;
}

export function PromptModal({ visible, title, placeholder, initialValue, submitLabel = "Save", onCancel, onSubmit }: PromptModalProps) {
  const [value, setValue] = useState(initialValue ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setValue(initialValue ?? "");
  }, [visible, initialValue]);

  const handleSubmit = async () => {
    if (!value.trim()) return;
    setSaving(true);
    try {
      await onSubmit(value.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="gap-4">
        <DialogTitle>{title}</DialogTitle>
        <Input placeholder={placeholder} value={value} onChangeText={setValue} autoFocus />
        <DialogFooter className="flex-row">
          <Button variant="outline" className="flex-1" onPress={onCancel} disabled={saving}>
            <Text>Cancel</Text>
          </Button>
          <Button className="flex-1" onPress={handleSubmit} disabled={saving || !value.trim()}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text>{submitLabel}</Text>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
