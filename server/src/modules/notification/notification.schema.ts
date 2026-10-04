import { z } from "zod";

export const listNotificationsQuerySchema = z.object({
  status: z.enum(["unread", "all"]).default("all"),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  // ISO timestamp of the last row seen — keyset pagination, see the service.
  cursor: z.string().optional(),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
