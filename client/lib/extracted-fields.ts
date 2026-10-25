/** "chapters_text", "postDate" → "Chapters text", "Post date". */
export function humanizeField(key: string): string {
  const words = key.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim();
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
}

/**
 * The short facts the AI pulled out of a memory (a date, a price, a name) to
 * show beside it: not long restatements (a video's chapter list, a
 * transcript), and nothing that only repeats its title or its own text.
 */
export function readableFields(fields: Record<string, unknown> | null | undefined, repeats: (string | null | undefined)[] = [], max = 4): { label: string; value: string }[] {
  const seen = new Set(repeats.filter(Boolean).map((r) => r!.trim().toLowerCase()));
  return Object.entries(fields ?? {})
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .map(([key, value]) => ({ label: humanizeField(key), value: value.trim() }))
    .filter(({ value }) => value && value.length <= 80 && !seen.has(value.toLowerCase()))
    .slice(0, max);
}
