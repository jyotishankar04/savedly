// The public API of the collection module: what other modules may import from it.
// Nothing here is a router (that's index.ts): importing it never loads this module's HTTP layer.
// Add a line when another module needs something; keep it small.

export { DEFAULT_COLLECTION_ICON, collectionIcon, createCollection, listCollections, updateCollection } from "./collection.service";
export { collectionNameKey } from "./collection-name";
