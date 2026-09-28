import { getSection, settingsVersion } from "../../instance-settings/instance-settings.service";
import { pgVectorStore } from "./pgvector-store";
import { createUpstashVectorStore } from "./upstash-store";
import type { VectorStore } from "./types";

export type { VectorStore, VectorUpsertInput, VectorChunkInput } from "./types";

let active: { version: number; store: VectorStore } | null = null;

/**
 * pgvector columns on this Postgres by default; Upstash Vector when configured
 * (VECTOR_STORE_PROVIDER in hosted production, or Admin -> Infrastructure on
 * a self-hosted install). Rebuilt whenever an admin saves new settings.
 */
export async function getVectorStore(): Promise<VectorStore> {
  if (active && active.version === settingsVersion()) return active.store;
  const settings = await getSection("vector");
  const store =
    settings.provider === "upstash"
      ? createUpstashVectorStore({ url: String(settings.upstashUrl), token: String(settings.upstashToken) })
      : pgVectorStore;
  active = { version: settingsVersion(), store };
  return store;
}
