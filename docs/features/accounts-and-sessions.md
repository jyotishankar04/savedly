# Accounts and sessions

This page describes the architecture and constraints for user accounts and sessions. Use this as a reference before modifying authentication or user-profile logic.

Sign-in is Google or GitHub OAuth only. See [Architecture](../ARCHITECTURE.md#request-lifecycle-and-authentication) for the token design.

The following table lists the owners for each account and session concern:

| Concern | Owner |
|---|---|
| OAuth flow, tokens, and sessions | `server/src/modules/auth/` |
| Roles and permissions | `roles`, `permissions`, `user_roles`, and `role_permissions` tables. Code checks `req.user.roles` from the JWT payload. |
| Profile, onboarding, and appearance settings | `server/src/modules/user/` and `server/src/modules/settings/` |
| Account deletion | `server/src/modules/account/account.service.ts`. This runs on a grace-period worker (`ACCOUNT_DELETION_GRACE_DAYS`); it does not immediately hard delete the account. |
