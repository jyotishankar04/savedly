"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMemoryQuery, useUpdateMemoryMutation } from "@/context/MemoryContext";
import { isMemoryProcessing } from "@/lib/memory-processing";
import { MemoryHighlights } from "@/components/memory/memory-highlights";
import { MemoryNote } from "@/components/memory/memory-note";
import { SocialPostView } from "@/components/memory/social-post";
import { MemoryDetailSkeleton } from "@/components/memory/detail/detail-skeleton";
import { DetailHeader } from "@/components/memory/detail/detail-header";
import { NoteSection } from "@/components/memory/detail/note-section";
import { LinkPreviewSection } from "@/components/memory/detail/link-preview-section";
import { AttachmentsSection } from "@/components/memory/detail/attachments-section";
import { UnderstandingPanel } from "@/components/memory/detail/understanding-panel";
import { looksLikeCode, TYPE_META } from "@/components/memory/detail/helpers";

export default function MemoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: memory, isLoading, isError } = useMemoryQuery(id);
  const updateMutation = useUpdateMemoryMutation();
  // Read once: whether a reminder is still to come only needs to be right when the page opens.
  const [openedAt] = useState(() => Date.now());

  // Opening it is reading it: out of the Inbox. Once per memory, and only when it was unread.
  const markedRead = useRef<string | null>(null);
  const markRead = updateMutation.mutate;
  useEffect(() => {
    if (!memory || memory.readAt !== null || markedRead.current === memory.id) return;
    markedRead.current = memory.id;
    markRead({ id: memory.id, patch: { isRead: true } });
  }, [memory, markRead]);

  if (isLoading) return <MemoryDetailSkeleton />;

  if (isError || !memory) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Memory not found</h2>
        <button onClick={() => router.push("/app/memories")} className="text-xs font-bold text-primary hover:underline">
          Back to library
        </button>
      </div>
    );
  }

  const meta = TYPE_META[memory.type] ?? TYPE_META.note;
  const processing = isMemoryProcessing(memory);
  const isNote = memory.type === "note";
  const code = isNote && looksLikeCode(memory);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8 animate-fade-in">
      <DetailHeader memory={memory} meta={meta} processing={processing} isNote={isNote} openedAt={openedAt} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left: the thing itself */}
        <div className="lg:col-span-2 space-y-8">
          {isNote ? (
            <NoteSection memory={memory} code={code} />
          ) : memory.socialPost ? (
            // A post or video read from its platform: who, what it says, the video with its transcript.
            <SocialPostView post={memory.socialPost} processing={processing} />
          ) : (
            <LinkPreviewSection memory={memory} meta={meta} processing={processing} />
          )}

          {/* Your note on a link or a file, written like a note in Notes ("note" memories edit their body above). */}
          {!isNote && <MemoryNote memoryId={memory.id} title={memory.title} content={memory.content} />}

          {memory.attachments.length > 0 && <AttachmentsSection attachments={memory.attachments} />}

          <MemoryHighlights memoryId={memory.id} highlights={memory.highlights ?? []} />
        </div>

        <UnderstandingPanel memory={memory} meta={meta} processing={processing} />
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
