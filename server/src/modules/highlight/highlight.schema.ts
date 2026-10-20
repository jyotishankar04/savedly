import { z } from "zod";
import { HighlightColor } from "../../db/enums";

const color = z.enum([HighlightColor.YELLOW, HighlightColor.GREEN, HighlightColor.BLUE, HighlightColor.PINK, HighlightColor.PURPLE]);

export const createHighlightSchema = z.object({
  // The page it's on: its memory, found the way duplicates are (or saved now).
  url: z.string().url(),
  title: z.string().max(500).optional(),
  text: z.string().trim().min(1).max(5000),
  // A few dozen characters either side, to find the passage again on the page.
  prefix: z.string().max(200).default(""),
  suffix: z.string().max(200).default(""),
  color: color.default(HighlightColor.YELLOW),
  note: z.string().max(2000).optional(),
});

export const updateHighlightSchema = z.object({
  color: color.optional(),
  // Null clears the note.
  note: z.string().max(2000).nullable().optional(),
});

export const highlightIdParamsSchema = z.object({ id: z.string().uuid() });
export const pageQuerySchema = z.object({ url: z.string().url() });

export type CreateHighlightInput = z.infer<typeof createHighlightSchema>;
export type UpdateHighlightInput = z.infer<typeof updateHighlightSchema>;
