import { and, eq, sql } from "drizzle-orm";
import { db } from "../../../../db";
import { collectionMemories, collections, memories, memoryTags, users } from "../../../../db/schema";
import { CollectionSource, MemoryStatus, MemoryType } from "../../../../db/enums";
import { resolveTagIds, type Tx } from "../../../memory/memory.service";
import { EVENT_DETECTION_CONFIDENCE_THRESHOLD, notifyEventDetected } from "../../../memory/memory.notify";
import { getVectorStore } from "../../vector-store";
import { isVideoUrl } from "../extract-url";
import { logNode } from "../log";
import type { IngestionStateType, IngestionUpdate } from "../state";
import { isPlaceholderTitle } from "../title";
import { collectionNameKey } from "./organize-collection";

async function assignCollection(tx: Tx, state: IngestionStateType): Promise<string | null> {
  if ((state.collectionAction !== "existing" && state.collectionAction !== "new") || !state.collectionName) return null;

  // Two saves finishing together could each decide to create "Birthdays";
  // holding a per-user lock while looking up and creating keeps it to one.
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`collections:${state.userId}`}))`);

  const userCollections = await tx
    .select({ id: collections.id, name: collections.name })
    .from(collections)
    .where(and(eq(collections.userId, state.userId), eq(collections.isVaulted, false)));
  const key = collectionNameKey(state.collectionName);
  let collectionId = userCollections.find((c) => collectionNameKey(c.name) === key)?.id ?? null;

  if (!collectionId) {
    const [created] = await tx
      .insert(collections)
      .values({
        userId: state.userId,
        name: state.collectionName,
        icon: state.collectionIcon || "📁",
        description: state.collectionDescription,
        // A normal, visible collection: nothing is paid or limited any more, so
        // there is no reason to hide what the AI files things into.
        source: CollectionSource.USER,
      })
      .returning({ id: collections.id });
    collectionId = created.id;
  }

  await tx.insert(collectionMemories).values({ collectionId, memoryId: state.memoryId }).onConflictDoNothing();
  return collectionId;
}

// Verbatim intent of docs/AI_REQUIREMENTS.md's UpsertPgVector node, split in
// two: scalar AI outputs (title/description/classification) always live on
// the `memories` row regardless of vector backend; only the embeddings go
// through the swappable VectorStore (pgvector locally, Upstash in prod).
export async function upsertVectors(state: IngestionStateType): Promise<IngestionUpdate> {
  let assignedCollectionId: string | null = null;

  // The client's own link detection may have missed it (or the memory was
  // never routed through a client that tries) — DetectContentType's regex
  // backstop found a URL in the raw text, so correct the stored type/url to
  // match rather than leave it filed as a plain note. Known limitation: this
  // doesn't loop back through ParseWebContent, so the embedded/chunked
  // content is still the original note text, not the fetched page — good
  // enough to be findable and correctly typed, not a full re-ingest.
  const reclassifiedAsLink = !state.url && !!state.detectedUrl;
  const correctedType = reclassifiedAsLink
    ? isVideoUrl(new URL(state.detectedUrl as string))
      ? MemoryType.VIDEO
      : MemoryType.WEB
    : undefined;

  // Reaching this node at all means every earlier node completed without
  // throwing — "failed" is reserved for a genuine thrown error (see
  // worker.ts's catch). A link-type memory is "ready" only once it actually
  // has a real preview image; every other case (blocked/no-og/non-link
  // types once classified) is "partial" — the memory always exists either
  // way, this only ever describes enrichment quality.
  const effectiveType = correctedType ?? state.mediaType;
  const isLinkType = effectiveType === MemoryType.WEB || effectiveType === MemoryType.VIDEO;
  const finalStatus =
    !isLinkType || state.previewStatus === "available" ? MemoryStatus.READY : MemoryStatus.PARTIAL;

  await db.transaction(async (tx) => {
    await tx
      .update(memories)
      .set({
        // Never overwrite a title the user actually typed — only fill in
        // over a placeholder (see isPlaceholderTitle). Prefers the AI title,
        // falling back to the page's own og:title/<title> when AI insight
        // generation itself came up empty (still better than "Untitled").
        title: isPlaceholderTitle(state.existingTitle) ? (state.aiTitle ?? state.previewTitle ?? undefined) : undefined,
        // Spelling/grammar-corrected version of what the user typed as a
        // caption — never runs for "note" (see correctCaption.ts), so a
        // note's own body is never touched here.
        content: state.correctedCaption ?? undefined,
        description: state.aiSummary ?? state.previewDescription ?? undefined,
        resourceCategory: state.resourceCategory,
        inferredIntent: state.inferredIntent,
        intentConfidence: state.intentConfidence,
        suggestedEventAt: state.detectedEventAt ? new Date(state.detectedEventAt) : undefined,
        eventDetectionConfidence: state.eventDetectionConfidence ?? undefined,
        contentType: state.contentType,
        extractedFields: Object.keys(state.extractedFields).length > 0 ? state.extractedFields : undefined,
        type: correctedType,
        url: reclassifiedAsLink ? (state.detectedUrl as string) : undefined,
        // Only ParseWebContent (web/video) ever populates these — leaves
        // other types' existing previewImageUrl (e.g. an image attachment's)
        // untouched.
        previewImageUrl: state.previewImageUrl ?? undefined,
        faviconUrl: state.faviconUrl ?? undefined,
        source: state.sourceDomain ?? undefined,
        previewStatus: state.previewStatus ?? undefined,
        previewSource: state.previewSource ?? undefined,
        platform: state.platform ?? undefined,
        resourceType: state.resourceType ?? undefined,
        canonicalUrl: state.canonicalUrl ?? undefined,
        fetchStatus: state.fetchStatus ?? undefined,
        status: finalStatus,
      })
      .where(eq(memories.id, state.memoryId));

    if (state.suggestedTags.length > 0) {
      const tagIds = await resolveTagIds(tx, state.userId, state.suggestedTags);
      if (tagIds.length > 0) {
        await tx
          .insert(memoryTags)
          .values(tagIds.map((tagId) => ({ memoryId: state.memoryId, tagId })))
          .onConflictDoNothing();
      }
    }

    assignedCollectionId = await assignCollection(tx, state);
  });

  // Skipped (not written as an empty/zero vector) when embeddings weren't
  // configured for this run — memories.document_embedding is a nullable
  // vector(1536) column and memory_chunks.embedding is NOT NULL, so there's
  // no valid "empty" vector to write for either. On a re-ingestion this also
  // means a previously-computed embedding is left untouched rather than
  // wiped out just because the key isn't configured right now; the fresh
  // AI_NOT_CONFIGURED case for a brand-new memory just leaves both at their
  // natural empty state (column default null / zero chunk rows) until
  // embeddings get configured and it's reprocessed.
  if (state.documentEmbedding.length > 0) {
    await (await getVectorStore()).upsertMemoryVectors({
      memoryId: state.memoryId,
      userId: state.userId,
      documentEmbedding: state.documentEmbedding,
      chunks: state.chunks.map((chunk, index) => ({
        index: chunk.index,
        content: chunk.content,
        tokenCount: chunk.tokenCount,
        embedding: state.chunkEmbeddings[index] ?? [],
      })),
    });
  }

  if (state.detectedEventAt && (state.eventDetectionConfidence ?? 0) >= EVENT_DETECTION_CONFIDENCE_THRESHOLD) {
    const [row] = await db
      .select({ email: users.email, eventAt: memories.eventAt })
      .from(memories)
      .innerJoin(users, eq(users.id, memories.userId))
      .where(eq(memories.id, state.memoryId))
      .limit(1);
    // A real eventAt already on the row means someone already confirmed a
    // date for this memory — e.g. it was created directly with a date via
    // the "create_calendar_event" agent tool or the calendar page's "New
    // event" form. Asking "want to add this to your calendar?" again would
    // be a redundant, confusing double-prompt for something already added.
    if (row?.email && !row.eventAt) {
      notifyEventDetected({
        userId: state.userId,
        email: row.email,
        memoryId: state.memoryId,
        memoryTitle: !isPlaceholderTitle(state.existingTitle) ? state.existingTitle : (state.aiTitle ?? "your memory"),
        suggestedEventAt: state.detectedEventAt,
      });
    }
  }

  logNode(state.memoryId, "upsertVectors", {
    titleWritten: isPlaceholderTitle(state.existingTitle) && !!state.aiTitle,
    tagsLinked: state.suggestedTags.length,
    chunksWritten: state.chunks.length,
    collectionAction: state.collectionAction,
    assignedCollectionId,
    reclassifiedAsLink,
    previewImageUrl: state.previewImageUrl,
    faviconUrl: state.faviconUrl,
    captionCorrected: !!state.correctedCaption,
    finalStatus,
    previewStatus: state.previewStatus,
    previewSource: state.previewSource,
    platform: state.platform,
    fetchStatus: state.fetchStatus,
  });

  return { finalStatus };
}
