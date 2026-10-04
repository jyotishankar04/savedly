# Sharing

This page describes how memories and collections are shared. Use this as a reference before modifying access controls, link modes, or invite logic.

The `server/src/modules/share/share.service.ts` file owns three link modes and direct invites, all evaluated against one `shares` row per resource.

The following table describes the link modes (`shares.link_access`):

| Link mode | Behavior |
|---|---|
| `public` | Anyone with the link can view the resource. |
| `password` | Requires a scrypt-hashed password (`shared/crypto/scrypt-password.ts`). This uses the same hashing algorithm as the Vault PIN. |
| `request` | Visitors submit an access request. The owner approves or denies it from `shareAccessRequests`. |

Direct invites (`shareGrants`) work independently of the link mode. Inviting an email address that doesn't have an account yet stores a `pending` grant. The system activates this grant automatically the moment a user signs up with that address (`claimPendingGrantsForEmail`).
