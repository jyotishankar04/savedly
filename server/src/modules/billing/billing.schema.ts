import { z } from "zod";

export const checkoutSchema = z.object({
  planKey: z.string().trim().min(1).max(50),
  // An upgrade charges the saved card at once, so the client shows the amount (POST
  // /billing/upgrade-preview) and sends this only after agreement.
  confirmUpgrade: z.boolean().optional(),
});

export const upgradePreviewSchema = z.object({
  planKey: z.string().trim().min(1).max(50),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type UpgradePreviewInput = z.infer<typeof upgradePreviewSchema>;
