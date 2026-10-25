// The public API of the account module: what other modules may import from it.
// Nothing here is a router (that's index.ts): importing it never loads this module's HTTP layer.
// Add a line when another module needs something; keep it small.

export { ACCOUNT_DELETION_GRACE_DAYS, hardDeleteAccount, revokeAllSessionsForUser } from "./account.service";
