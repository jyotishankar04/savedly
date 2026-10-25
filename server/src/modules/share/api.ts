// The public API of the share module: what other modules may import from it.
// Nothing here is a router (that's index.ts): importing it never loads this module's HTTP layer.
// Add a line when another module needs something; keep it small.

export { claimPendingGrantsForEmail } from "./share.grants";
