import { z } from "zod";

export const analyticsRangeQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export type AnalyticsRangeQuery = z.infer<typeof analyticsRangeQuerySchema>;
