// The public API of the memory module: what other modules may import from it.
// Nothing here is a router (that's index.ts): importing it never loads this module's HTTP layer.
// Add a line when another module needs something; keep it small.

export { DuplicateStatus, findDuplicate } from "./duplicates";
export { lookupByUrl, urlKey } from "./inbox.service";
export { collectMemoryFileKeys, deleteUnusedFiles, ownFileKey } from "./memory-files";
export { EVENT_DETECTION_CONFIDENCE_THRESHOLD, notifyDuplicateDetected, notifyEventDetected } from "./memory.notify";
export { createMemory, deleteMemory, getMemoryById, listMemories, resolveTagIds, updateMemory, type Tx } from "./memory.service";
export { normalizeUrl } from "./normalize-url";
export { sendWeeklyDigestTo } from "./weekly-digest.job";
