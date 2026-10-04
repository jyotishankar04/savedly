import { z } from "zod";
import { ShareLinkAccess, ShareResourceType } from "../../db/enums";

export const shareResourceTypeSchema = z.enum([ShareResourceType.COLLECTION, ShareResourceType.MEMORY]);

export const createShareSchema = z.object({
  resourceType: shareResourceTypeSchema,
  resourceId: z.string().uuid(),
});

// A share password guards a read-only link that's often passed along
// verbally — a length floor is worth having, complexity rules are not.
const sharePasswordSchema = z.string().min(6, "Password must be at least 6 characters").max(128);

export const updateShareSchema = z
  .object({
    linkAccess: z.enum([
      ShareLinkAccess.DISABLED,
      ShareLinkAccess.PUBLIC,
      ShareLinkAccess.REQUEST,
      ShareLinkAccess.PASSWORD,
    ]),
    // null clears the password; undefined leaves it untouched. The service
    // rejects switching to `password` with neither a new password nor an
    // existing hash, matching the ck_shares_password_present constraint.
    password: sharePasswordSchema.nullable(),
    allowSearchIndexing: z.boolean(),
    expiresAt: z.coerce.date().nullable(),
  })
  .partial();

export const inviteToShareSchema = z.object({
  // Lowercased here so the unique index and the signup-time claim always
  // compare the same shape — users.email is plain varchar, not citext.
  email: z.string().email().max(255).toLowerCase(),
});

export const unlockShareSchema = z.object({
  password: z.string().min(1).max(128),
});

export const requestAccessSchema = z.object({
  message: z.string().max(500).optional(),
});

export const listSharesQuerySchema = z.object({
  resourceType: shareResourceTypeSchema.optional(),
});

export type CreateShareInput = z.infer<typeof createShareSchema>;
export type UpdateShareInput = z.infer<typeof updateShareSchema>;
export type InviteToShareInput = z.infer<typeof inviteToShareSchema>;
export type UnlockShareInput = z.infer<typeof unlockShareSchema>;
export type RequestAccessInput = z.infer<typeof requestAccessSchema>;
export type ListSharesQuery = z.infer<typeof listSharesQuerySchema>;
