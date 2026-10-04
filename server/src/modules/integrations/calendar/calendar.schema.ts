import { z } from "zod";

export const pushEventBodySchema = z.object({
  provider: z.enum(["google", "microsoft"]),
});

export type PushEventInput = z.infer<typeof pushEventBodySchema>;

export const disconnectParamsSchema = z.object({
  provider: z.enum(["google", "microsoft"]),
});

export const listEventsQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
});

export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;

export const createEventBodySchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  startAt: z.string().datetime(),
  durationMinutes: z.number().int().positive().max(24 * 60).optional(),
});

export type CreateEventInput = z.infer<typeof createEventBodySchema>;

export const updateEventBodySchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).nullable().optional(),
  startAt: z.string().datetime().optional(),
  durationMinutes: z.number().int().positive().max(24 * 60).optional(),
});

export type UpdateEventInput = z.infer<typeof updateEventBodySchema>;

export const updateExternalEventBodySchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).nullable().optional(),
  startAt: z.string().datetime(),
  durationMinutes: z.number().int().positive().max(24 * 60).optional(),
});

export type UpdateExternalEventInput = z.infer<typeof updateExternalEventBodySchema>;

export const externalEventParamsSchema = z.object({
  provider: z.enum(["google", "microsoft"]),
  externalId: z.string().min(1),
});

export type ExternalEventParams = z.infer<typeof externalEventParamsSchema>;
