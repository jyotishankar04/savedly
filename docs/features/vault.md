# Vault

This page describes the Vault feature, which gates a set of memories and collections behind a PIN. Use this as a reference before modifying Vault access or security logic.

The `server/src/modules/vault/vault.service.ts` file gates content using a PIN. The system scrypt-hashes the PIN identically to share passwords (`vaultPinHash` on `users`). Setting a new PIN requires no current one; changing an existing PIN does require the current one, so an already-open session alone cannot silently swap it out.

Unlocking the Vault issues a signed proof cookie (`VAULT_TOKEN_SECRET`) that embeds the PIN's `vaultPinUpdatedAt` timestamp (`pv`) at the moment it was verified. Changing the PIN later invalidates every previously-issued unlock token automatically, because the embedded `pv` no longer matches.

This is access control, not encryption: the system stores vaulted content the same way as any other memory, but hides it from default queries and gates it behind this cookie.
