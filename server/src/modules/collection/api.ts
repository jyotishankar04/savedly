// Public API of the collection module: what other modules may import (never routers; see index.ts).

export { DEFAULT_COLLECTION_ICON, collectionIcon, createCollection, listCollections, updateCollection } from "./collection.service";
export { collectionNameKey } from "./collection-name";
