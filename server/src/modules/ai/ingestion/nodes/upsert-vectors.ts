import { and, eq, sql } from "drizzle-orm";
import { db } from "../../../../db";
import { collectionMemories, collections, memories, memoryTags, users } from "../../../../db/schema";
import { CollectionSource, MemoryStatus, MemoryType } from "../../../../db/enums";
import { resolveTagIds, type Tx, EVENT_DETECTION_CONFIDENCE_THRESHOLD, notifyEventDetected } from "../../../memory/api";
import { getVectorStore } from "../../vector-store";
import { isVideoUrl } from "../extract-url";
import { logNode } from "../log";
import type { IngestionStateType, IngestionUpdate } from "../state";
import { isPlaceholderTitle } from "../title";
import { collectionIcon, collectionNameKey } from "../../../collection/api";

type MediaType = IngestionStateType["mediaType"];
type CorrectedType = MemoryType.VIDEO | MemoryType.WEB;

async function assignCollection(tx: Tx, state: IngestionStateType): Promise<string | null> {
  if ((state.collectionAction !== "existing" && state.collectionAction !== "new") || !state.collectionName) return null;

  // Two saves finishing together could both create "Birthdays"; a per-user lock keeps it to one.
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
        icon: collectionIcon(state.collectionIcon),
        description: state.collectionDescription,
        // A normal visible collection: nothing is limited now, so nothing needs hiding.
        source: CollectionSource.USER,
      })
      .returning({ id: collections.id });
    collectionId = created.id;
  }

  await tx.insert(collectionMemories).values({ collectionId, memoryId: state.memoryId }).onConflictDoNothing();
  return collectionId;
}

/**
 * The client may have missed a link that DetectContentType's regex found, so correct the type and
 * url. Known limitation: ParseWebContent isn't re-run, so the chunks are still the note text.
 */
function correctedMemoryType(state: IngestionStateType): { reclassifiedAsLink: boolean; correctedType: CorrectedType | undefined } {
  const reclassifiedAsLink = !state.url && !!state.detectedUrl;
  // A link that turned out to be a video (a YouTube or TikTok post saved as a page) is filed as one.
  const postIsVideo = !!state.socialPost && state.mediaType === MemoryType.WEB && ["video", "short"].includes(state.socialPost.kind) && ["youtube", "tiktok"].includes(state.socialPost.platform);
  const correctedType = reclassifiedAsLink
    ? isVideoUrl(new URL(state.detectedUrl as string))
      ? MemoryType.VIDEO
      : MemoryType.WEB
    : postIsVideo
      ? MemoryType.VIDEO
      : undefined;
  return { reclassifiedAsLink, correctedType };
}

/** A link titled with its own address or site ("x.com", the URL) wasn't named by anyone either. */
function isTitledByItsUrl(state: IngestionStateType): boolean {
  if (!state.url) return false;
  const title = state.existingTitle.trim().toLowerCase();
  try {
    const host = new URL(state.url).hostname.replace(/^www\./, "").toLowerCase();
    return title === state.url.toLowerCase() || title === host || title === `www.${host}`;
  } catch {
    return false;
  }
}

/**
 * Reaching here means no node threw ("failed" is only for a throw, see worker.ts). A link memory is
 * "ready" only with a real preview image, otherwise "partial".
 */
function finalStatusFor(state: IngestionStateType, effectiveType: CorrectedType | MediaType): MemoryStatus {
  const isLinkType = effectiveType === MemoryType.WEB || effectiveType === MemoryType.VIDEO;
  return !isLinkType || state.previewStatus === "available" ? MemoryStatus.READY : MemoryStatus.PARTIAL;
}

/** The scalar AI outputs and preview fields written onto the memory row. */
function memoryRowUpdate(
  state: IngestionStateType,
  fixes: { correctedType: CorrectedType | undefined; reclassifiedAsLink: boolean; urlTitle: boolean; finalStatus: MemoryStatus },
) {
  const { correctedType, reclassifiedAsLink, urlTitle, finalStatus } = fixes;
  return {
    // Never overwrite a user-typed title; fill only over a placeholder, preferring the AI title,
    // then the page's.
    title: isPlaceholderTitle(state.existingTitle) || urlTitle ? (state.aiTitle ?? state.previewTitle ?? undefined) : undefined,
    // Spelling-corrected caption; never runs for notes (correctCaption.ts), so a note's body is untouched.
    content: state.correctedCaption ?? undefined,
    description: state.aiSummary ?? state.previewDescription ?? undefined,
    resourceCategory: state.resourceCategory,
    inferredIntent: state.inferredIntent,
    intentConfidence: state.intentConfidence,
    suggestedEventAt: state.detectedEventAt ? new Date(state.detectedEventAt) : undefined,
    eventDetectionConfidence: state.eventDetectionConfidence ?? undefined,
    contentType: state.contentType,
    extractedFields: Object.keys(state.extractedFields).length > 0 ? state.extractedFields : undefined,
    // A re-run that didn't need to look anything up keeps the earlier lookup.
    webResearch: state.webResearch ?? undefined,
    type: correctedType,
    url: reclassifiedAsLink ? (state.detectedUrl as string) : undefined,
    // Only ParseWebContent (web/video) sets these; other types' images (e.g. an attachment's) are left alone.
    previewImageUrl: state.previewImageUrl ?? undefined,
    faviconUrl: state.faviconUrl ?? undefined,
    source: state.sourceDomain ?? undefined,
    previewStatus: state.previewStatus ?? undefined,
    previewSource: state.previewSource ?? undefined,
    platform: state.platform ?? undefined,
    resourceType: state.resourceType ?? undefined,
    canonicalUrl: state.canonicalUrl ?? undefined,
    fetchStatus: state.fetchStatus ?? undefined,
    socialPost: state.socialPost ?? undefined,
    status: finalStatus,
  };
}

async function linkSuggestedTags(tx: Tx, state: IngestionStateType): Promise<void> {
  if (state.suggestedTags.length === 0) return;
  const tagIds = await resolveTagIds(tx, state.userId, state.suggestedTags);
  if (tagIds.length === 0) return;
  await tx
    .insert(memoryTags)
    .values(tagIds.map((tagId) => ({ memoryId: state.memoryId, tagId })))
    .onConflictDoNothing();
}

/**
 * Skipped without embeddings configured: document_embedding is nullable but memory_chunks.embedding
 * is NOT NULL, so there's no empty vector. A re-ingest keeps the earlier one.
 */
async function storeEmbeddings(state: IngestionStateType): Promise<void> {
  if (state.documentEmbedding.length === 0) return;
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

async function notifyIfEventDetected(state: IngestionStateType): Promise<void> {
  if (!state.detectedEventAt || (state.eventDetectionConfidence ?? 0) < EVENT_DETECTION_CONFIDENCE_THRESHOLD) return;
  const [row] = await db
    .select({ email: users.email, eventAt: memories.eventAt })
    .from(memories)
    .innerJoin(users, eq(users.id, memories.userId))
    .where(eq(memories.id, state.memoryId))
    .limit(1);
  // A real eventAt means a date was already confirmed (agent tool or "New event" form); don't ask again.
  if (!row?.email || row.eventAt) return;
  notifyEventDetected({
    userId: state.userId,
    email: row.email,
    memoryId: state.memoryId,
    memoryTitle: !isPlaceholderTitle(state.existingTitle) ? state.existingTitle : (state.aiTitle ?? "your memory"),
    suggestedEventAt: state.detectedEventAt,
  });
}

// Follows docs/AI_REQUIREMENTS.md's UpsertPgVector, split: scalar AI outputs live on `memories`;
// only embeddings use the swappable VectorStore.
export async function upsertVectors(state: IngestionStateType): Promise<IngestionUpdate> {
  const { reclassifiedAsLink, correctedType } = correctedMemoryType(state);
  const urlTitle = isTitledByItsUrl(state);
  const finalStatus = finalStatusFor(state, correctedType ?? state.mediaType);

  let assignedCollectionId: string | null = null;
  await db.transaction(async (tx) => {
    await tx
      .update(memories)
      .set(memoryRowUpdate(state, { correctedType, reclassifiedAsLink, urlTitle, finalStatus }))
      .where(eq(memories.id, state.memoryId));
    await linkSuggestedTags(tx, state);
    assignedCollectionId = await assignCollection(tx, state);
  });

  await storeEmbeddings(state);
  await notifyIfEventDetected(state);

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
