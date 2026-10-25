// The public API of the ai module: what other modules may import from it.
// Nothing here is a router (that's index.ts): importing it never loads this module's HTTP layer.
// Add a line when another module needs something; keep it small.

export { OPENROUTER_BASE_URL, hasOwnCredential, platformCredential, platformCredentialFrom, platformEmbeddingsCredential } from "./credentials";
export { getChatModel, getPlatformChatModel } from "./models";
export { testEmbeddingsCredential, testRoleCredential, type TestCredentialResult } from "./credential-tests";
export { enqueueIngestion, enqueueIngestionBulk, enqueueNoteRefresh, enqueueNoteReindex } from "./ingestion/queue";
export { countMemoriesToReindex, isReindexRunning, reindexMemories } from "./ingestion/reembed";
export { findHelp, loadSitePages } from "./rag/tools/platform-help";
export { SEMANTIC_SIMILARITY_FLOOR, hybridSearch } from "./search/index";
export { UNTRUSTED_RULE, wrapUntrusted } from "./untrusted";
export { type SocialPost } from "./url-processor/index";
export { getVectorStore } from "./vector-store/index";
export { pineconeClient } from "./vector-store/pinecone-store";
export { searchWith } from "./web-search/web-search";
