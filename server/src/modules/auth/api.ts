// Public API of the auth module: what other modules may import (never routers; see index.ts).

export { assignAdminRole, assignDefaultRole, getUserWithRoles } from "./auth.users";
export { getOAuthCredentials, requireOAuthCredentials } from "./oauth-config";
