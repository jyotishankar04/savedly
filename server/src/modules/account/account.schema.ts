import { z } from "zod";

export const clearMemoriesSchema = z.object({
  mode: z.enum(["trash", "delete"]),
});

export const deleteAccountSchema = z.object({
  mode: z.enum(["soft", "hard"]),
});

export type ClearMemoriesInput = z.infer<typeof clearMemoriesSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
