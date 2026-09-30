import { z } from "zod";

export const checkoutSchema = z.object({
  planKey: z.string().trim().min(1).max(50),
  // A subscriber's upgrade charges the saved card straight away, so the
  // client must show the amount (POST /billing/upgrade-preview) and send
  // this only after the person agrees.
  confirmUpgrade: z.boolean().optional(),
});

export const upgradePreviewSchema = z.object({
  planKey: z.string().trim().min(1).max(50),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type UpgradePreviewInput = z.infer<typeof upgradePreviewSchema>;
