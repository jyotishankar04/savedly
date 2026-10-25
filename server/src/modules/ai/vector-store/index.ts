import { getSection, settingsVersion } from "../../../platform/instance-settings/instance-settings.service";
import { pgVectorStore } from "./pgvector-store";
import { createPineconeVectorStore } from "./pinecone-store";
import { createUpstashVectorStore } from "./upstash-store";
import type { VectorStore } from "./types";

export type { VectorStore, VectorUpsertInput, VectorChunkInput } from "./types";

let active: { version: number; store: VectorStore } | null = null;

/** pgvector by default; Upstash or Pinecone when configured. Rebuilt when settings change. */
export async function getVectorStore(): Promise<VectorStore> {
  if (active && active.version === settingsVersion()) return active.store;
  const settings = await getSection("vector");
  const store =
    settings.provider === "upstash"
      ? createUpstashVectorStore({ url: String(settings.upstashUrl), token: String(settings.upstashToken) })
      : settings.provider === "pinecone"
        ? createPineconeVectorStore({ apiKey: String(settings.pineconeApiKey), host: String(settings.pineconeHost) })
        : pgVectorStore;
  active = { version: settingsVersion(), store };
  return store;
}
