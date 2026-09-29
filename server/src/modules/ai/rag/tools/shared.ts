import type { ToolRuntime } from "@langchain/core/tools";
import { listCollections } from "../../../collection/collection.service";
import { collectionNameKey } from "../../ingestion/nodes/organize-collection";
import type { ragToolContextSchema } from "./search-memories";

// Small helpers the Ask tools share.

export type RagRuntime = ToolRuntime<unknown, typeof ragToolContextSchema>;

export function requireUserId(runtime: RagRuntime, toolName: string): string {
  const userId = runtime.context?.userId;
  if (!userId) throw new Error(`${toolName}: missing userId in runtime context`);
  return userId;
}

/** Text trimmed to `max` characters, marked when it was cut. */
export function excerpt(text: string | null | undefined, max: number): string {
  if (!text) return "";
  const clean = text.trim();
  return clean.length > max ? `${clean.slice(0, max)}… (truncated)` : clean;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A collection's id from its id or its name (case-insensitive, exact first,
 * then "contains"). Throws a readable error the model can relay when none
 * matches, listing the names it could have meant.
 */
export async function resolveCollectionId(userId: string, nameOrId: string): Promise<{ id: string; name: string }> {
  const collections = await listCollections(userId, { includeSystem: true, isVaulted: false });
  if (UUID.test(nameOrId)) {
    const byId = collections.find((c) => c.id === nameOrId);
    if (byId) return { id: byId.id, name: byId.name };
  }
  const wanted = nameOrId.trim().toLowerCase();
  const wantedKey = collectionNameKey(nameOrId);
  const match =
    collections.find((c) => c.name.toLowerCase() === wanted) ??
    collections.find((c) => collectionNameKey(c.name) === wantedKey) ??
    collections.find((c) => c.name.toLowerCase().includes(wanted));
  if (!match) {
    const names = collections.map((c) => c.name).join(", ") || "none yet";
    throw new Error(`No collection called "${nameOrId}". The user's collections: ${names}.`);
  }
  return { id: match.id, name: match.name };
}

// Plans without bulk actions get one organizing change (tags or
// collections) per question, so Ask can't turn "tag all my links" into
// the same edit made one memory at a time. Keyed by question (turnId).
const organizedInTurn = new Map<string, number>();

export function takeOrganizeSlot(turnId: string | undefined): boolean {
  if (!turnId) return true;
  if (organizedInTurn.has(turnId)) return false;
  organizedInTurn.set(turnId, Date.now());
  // Forget old questions so the map stays small.
  if (organizedInTurn.size > 5000) {
    const cutoff = Date.now() - 60 * 60_000;
    for (const [id, at] of organizedInTurn) if (at < cutoff) organizedInTurn.delete(id);
  }
  return true;
}

