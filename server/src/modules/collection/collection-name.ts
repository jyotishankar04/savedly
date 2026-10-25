// How collection names are compared, so near-duplicates are recognised (used when the AI files a save, when Ask finds a collection by name, and in the extension's suggestions).

/** A rough English singular, enough to line up "Taxes"/"Tax", "Glasses"/"Glass" and "Birthdays"/"Birthday". */
function singular(word: string): string {
  if (word.length <= 3) return word;
  if (/(ss|x|z|ch|sh)es$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

/**
 * A comparable form of a collection name, so "Birthdays", "birthday" and
 * "Meetings & Scheduling" / "meeting and scheduling" count as the same
 * collection instead of becoming near-duplicates.
 */
export function collectionNameKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .map(singular)
    .join(" ");
}
