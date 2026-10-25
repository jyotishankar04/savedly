// Public API of the feature-flags module: what other modules may import (never routers; see index.ts).

export { getAdvancedSearchMaxQueryLength, getAdvancedSearchMaxResults, getBatchMaxSize, isAdvancedSearchEnabled, isBatchOperationsEnabled, isCalendarProviderEnabled, isCalendarSyncEnabled, isGithubStarsEnabled, isImportEnabled, isPasswordAuthEnabled, isProviderEnabled, isSignupsEnabled, isVaultEnabled } from "./feature-flags.service";
