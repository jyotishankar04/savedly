"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon as ArrowLeft } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/toast";
import { RecipientPicker } from "@/components/admin/recipient-picker";
import { BlocksSection } from "@/components/admin/email-composer/blocks-section";
import { STARTERS, blockProblem, newBlock, toContent, type BlockType, type Draft, type DraftBlock } from "@/components/admin/email-composer/draft";
import { StarterSection, SubjectSection } from "@/components/admin/email-composer/heading-sections";
import { PreviewPane, type PreviewDevice } from "@/components/admin/email-composer/preview-pane";
import { RecipientsSection } from "@/components/admin/email-composer/recipients-section";
import type { AdminUser } from "@/lib/admin-users";
import { previewEmail, sendEmail, sendTestEmail, type EmailContent } from "@/lib/admin-emails";

export default function ComposeEmailPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState<Draft>(() => STARTERS[0].draft());
  const [starter, setStarter] = useState("Blank");
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<Map<string, AdminUser>>(new Map());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const setBlock = (id: string, fields: Partial<DraftBlock>) =>
    setDraft((d) => ({ ...d, blocks: d.blocks.map((block) => (block.id === id ? { ...block, ...fields } : block)) }));
  const addBlock = (type: BlockType) => setDraft((d) => ({ ...d, blocks: [...d.blocks, newBlock(type)] }));
  const removeBlock = (id: string) => setDraft((d) => ({ ...d, blocks: d.blocks.filter((block) => block.id !== id) }));
  const moveBlock = (index: number, delta: number) =>
    setDraft((d) => {
      const target = index + delta;
      if (target < 0 || target >= d.blocks.length) return d;
      const blocks = [...d.blocks];
      [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
      return { ...d, blocks };
    });
  const removeUser = (id: string) =>
    setSelectedUsers((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });

  const content = useMemo(() => toContent(draft), [draft]);
  const blockProblems = draft.blocks.map(blockProblem).filter((problem): problem is string => problem !== null);
  const hasContent = content.blocks.some((block) => block.type !== "divider");
  const recipientCount = sendToAll ? null : selectedUsers.size;

  const problem = !draft.subject.trim()
    ? "Add a subject."
    : !hasContent
      ? "Add some content."
      : (blockProblems[0] ?? (!sendToAll && selectedUsers.size === 0 ? "Choose at least one recipient." : null));

  // The preview is the server's own rendering of this email, so what's shown
  // is what's sent. Asked for a moment after typing stops.
  const previewKey = JSON.stringify({ subject: draft.subject, content });
  const latestRequest = useRef(0);
  useEffect(() => {
    if (!hasContent) return;
    const request = ++latestRequest.current;
    const timer = setTimeout(async () => {
      setPreviewing(true);
      try {
        const { html } = await previewEmail(JSON.parse(previewKey) as { subject: string; content: EmailContent });
        if (request !== latestRequest.current) return;
        setPreviewHtml(html);
        setPreviewError(null);
      } catch (err) {
        if (request !== latestRequest.current) return;
        setPreviewError(err instanceof Error ? err.message : "Couldn't build the preview.");
      } finally {
        if (request === latestRequest.current) setPreviewing(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [previewKey, hasContent]);

  const applyStarter = (name: string) => {
    const found = STARTERS.find((entry) => entry.name === name);
    if (!found) return;
    setStarter(name);
    setDraft(found.draft());
  };

  const sendTest = async () => {
    if (!hasContent || blockProblems.length > 0) return;
    setTesting(true);
    try {
      const { to } = await sendTestEmail({ subject: draft.subject.trim(), content });
      toast.add({ title: "Test sent", description: `Check ${to}. It arrives with [Test] in the subject.`, type: "success" });
    } catch (err) {
      toast.add({ title: "Couldn't send the test", description: err instanceof Error ? err.message : undefined, type: "error" });
    } finally {
      setTesting(false);
    }
  };

  const send = async () => {
    if (problem) return;
    setConfirmOpen(false);
    setSending(true);
    try {
      const result = await sendEmail({
        subject: draft.subject.trim(),
        content,
        category: draft.category,
        recipients: sendToAll ? { all: true } : { userIds: Array.from(selectedUsers.keys()) },
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "emails"] });
      toast.add({ title: "Email queued", description: `${result.recipientCount} recipient${result.recipientCount === 1 ? "" : "s"}${result.unsubscribedCount > 0 ? `. ${result.unsubscribedCount} left out: unsubscribed` : ""}`, type: "success" });
      router.push("/admin/emails");
    } catch (err) {
      toast.add({ title: "Couldn't send the email", description: err instanceof Error ? err.message : undefined, type: "error" });
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/emails" className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground">
            <HugeiconsIcon icon={ArrowLeft} strokeWidth={2.25} className="h-3 w-3" />
            Emails
          </Link>
          <h1 className="mt-1 text-lg font-bold text-foreground">Compose email</h1>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
            Build the email from blocks. The preview is exactly what recipients get, in the same design as every other Savedly email.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="lg" disabled={testing || !hasContent || blockProblems.length > 0} onClick={sendTest}>
            {testing ? "Sending…" : "Send me a test"}
          </Button>
          <Button size="lg" disabled={sending || !!problem} onClick={() => setConfirmOpen(true)}>
            {sending ? "Sending…" : sendToAll ? "Send to all users" : `Send to ${recipientCount} ${recipientCount === 1 ? "user" : "users"}`}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,34rem)]">
        <div className="space-y-4">
          <StarterSection starter={starter} onPick={applyStarter} />
          <SubjectSection draft={draft} set={set} />
          <BlocksSection blocks={draft.blocks} onChange={setBlock} onAdd={addBlock} onRemove={removeBlock} onMove={moveBlock} />
          <RecipientsSection
            sendToAll={sendToAll}
            onSendToAllChange={setSendToAll}
            selectedUsers={selectedUsers}
            onRemoveUser={removeUser}
            onChoose={() => setPickerOpen(true)}
          />

          <p className="text-[11px] text-destructive" role="status">
            {problem ?? ""}
          </p>
        </div>

        <PreviewPane
          subject={draft.subject}
          previewing={previewing}
          device={device}
          onDeviceChange={setDevice}
          hasContent={hasContent}
          html={previewHtml}
          error={previewError}
        />
      </div>

      <RecipientPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        selected={selectedUsers}
        onToggle={(user) =>
          setSelectedUsers((prev) => {
            const next = new Map(prev);
            if (next.has(user.id)) next.delete(user.id);
            else next.set(user.id, user);
            return next;
          })
        }
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{sendToAll ? "Send to every active user?" : `Send to ${recipientCount} ${recipientCount === 1 ? "user" : "users"}?`}</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{draft.subject.trim()}&rdquo; will be queued for delivery straight away. An email can&apos;t be recalled once it&apos;s sent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={send}>Send email</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
