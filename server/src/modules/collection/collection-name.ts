// How collection names are compared to catch near-duplicates (AI filing, Ask lookups, extension suggestions).

/** A rough English singular, enough for "Taxes"/"Tax", "Glasses"/"Glass", "Birthdays"/"Birthday". */
function singular(word: string): string {
  if (word.length <= 3) return word;
  if (/(ss|x|z|ch|sh)es$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

/**
 * A comparable form, so "Birthdays"/"birthday" and "Meetings & Scheduling"/"meeting and scheduling"
 * match.
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
