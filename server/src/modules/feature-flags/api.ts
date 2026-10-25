// The public API of the feature-flags module: what other modules may import from it.
// Nothing here is a router (that's index.ts): importing it never loads this module's HTTP layer.
// Add a line when another module needs something; keep it small.

export { getAdvancedSearchMaxQueryLength, getAdvancedSearchMaxResults, getBatchMaxSize, isAdvancedSearchEnabled, isBatchOperationsEnabled, isCalendarProviderEnabled, isCalendarSyncEnabled, isGithubStarsEnabled, isImportEnabled, isPasswordAuthEnabled, isProviderEnabled, isSignupsEnabled, isVaultEnabled } from "./feature-flags.service";
