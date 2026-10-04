# Search

This page describes how the search feature operates across lexical and semantic layers. Use this as a reference before modifying search algorithms or filters.

See [Search architecture](../ARCHITECTURE.md#search-architecture) for the hybrid lexical and semantic design. 

The dashboard's Search page adds filtering (type, collection, tag, date range) on top of the merged result list. The system applies filters after the two legs are combined in `server/src/modules/search/`.
