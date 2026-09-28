import { z } from "zod";

export const checkoutSchema = z.object({
  planKey: z.string().trim().min(1).max(50),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
