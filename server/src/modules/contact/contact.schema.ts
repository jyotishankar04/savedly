import { z } from "zod";

export const CONTACT_TOPICS = ["Question", "Account", "Bug", "Idea", "Other"] as const;

export const sendContactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  topic: z.enum(CONTACT_TOPICS),
  message: z.string().trim().min(1).max(5000),
});

export type SendContactInput = z.infer<typeof sendContactSchema>;
