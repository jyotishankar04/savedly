/**
 * What changed between two versions of a text, the way `git diff --word-diff`
 * shows it: lines are matched first, then the words inside each changed line,
 * so a long note stays quick (no comparison of every word with every word).
 */

export type DiffPart = { kind: "same" | "added" | "removed"; text: string };
export type DiffLine =
  | { kind: "same"; text: string }
  | { kind: "added" | "removed"; text: string }
  | { kind: "changed"; parts: DiffPart[] };

type Op<T> = { kind: "same" | "added" | "removed"; item: T };

// Past this many cells the comparison is skipped and the run counts as replaced.
const MAX_CELLS = 2_000_000;

/** The shortest list of keeps, removals and additions turning `a` into `b` (longest common subsequence). */
function sequenceDiff<T>(a: T[], b: T[]): Op<T>[] {
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  const head: Op<T>[] = a.slice(0, start).map((item) => ({ kind: "same", item }));
  const tail: Op<T>[] = a.slice(endA).map((item) => ({ kind: "same", item }));
  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  const n = midA.length;
  const m = midB.length;

  let middle: Op<T>[];
  if (n * m > MAX_CELLS) {
    middle = [...midA.map((item) => ({ kind: "removed" as const, item })), ...midB.map((item) => ({ kind: "added" as const, item }))];
  } else {
    // lengths[i][j]: the longest common run of midA[i..] and midB[j..].
    const lengths = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        lengths[i]![j] = midA[i] === midB[j] ? lengths[i + 1]![j + 1]! + 1 : Math.max(lengths[i + 1]![j]!, lengths[i]![j + 1]!);
      }
    }
    middle = [];
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (midA[i] === midB[j]) {
        middle.push({ kind: "same", item: midA[i]! });
        i++;
        j++;
      } else if (lengths[i + 1]![j]! >= lengths[i]![j + 1]!) middle.push({ kind: "removed", item: midA[i++]! });
      else middle.push({ kind: "added", item: midB[j++]! });
    }
    while (i < n) middle.push({ kind: "removed", item: midA[i++]! });
    while (j < m) middle.push({ kind: "added", item: midB[j++]! });
  }
  return [...head, ...middle, ...tail];
}

/**
 * Words and single punctuation marks, each with the spaces after it, so only
 * words are lined up (never one space against another) and "Friday," differs
 * from "Friday" only by the comma.
 */
const tokens = (line: string) => line.match(/^\s+|[\p{L}\p{N}_'’-]+\s*|[^\s\p{L}\p{N}]\s*/gu) ?? [];

/** Neighbouring parts of the same kind joined, so "a new idea" is one green run, not three. */
function merge(parts: DiffPart[]): DiffPart[] {
  const out: DiffPart[] = [];
  for (const part of parts) {
    const last = out[out.length - 1];
    if (last && last.kind === part.kind) last.text += part.text;
    else out.push({ ...part });
  }
  return out;
}

/** The lines of `after` against `before`: kept, added, removed, or changed (with the words that changed). */
export function diffText(before: string, after: string): DiffLine[] {
  const ops = sequenceDiff(before.split("\n"), after.split("\n"));
  const lines: DiffLine[] = [];
  for (let k = 0; k < ops.length; ) {
    if (ops[k]!.kind === "same") {
      lines.push({ kind: "same", text: ops[k]!.item });
      k++;
      continue;
    }
    // A run of removals and additions: pair them up as changed lines, line by line.
    const removed: string[] = [];
    const added: string[] = [];
    while (k < ops.length && ops[k]!.kind !== "same") {
      (ops[k]!.kind === "removed" ? removed : added).push(ops[k]!.item);
      k++;
    }
    const paired = Math.min(removed.length, added.length);
    for (let p = 0; p < paired; p++) {
      const words = sequenceDiff(tokens(removed[p]!), tokens(added[p]!)).map((op) => ({ kind: op.kind, text: op.item }));
      lines.push({ kind: "changed", parts: merge(words) });
    }
    for (const text of removed.slice(paired)) lines.push({ kind: "removed", text });
    for (const text of added.slice(paired)) lines.push({ kind: "added", text });
  }
  return lines;
}

/** How many words were removed and added, for a one-line summary. */
export function diffCounts(lines: DiffLine[]): { removed: number; added: number } {
  const words = (text: string) => (text.match(/[\p{L}\p{N}]+/gu) ?? []).length;
  let removed = 0;
  let added = 0;
  for (const line of lines) {
    if (line.kind === "removed") removed += words(line.text);
    else if (line.kind === "added") added += words(line.text);
    else if (line.kind === "changed")
      for (const part of line.parts) {
        if (part.kind === "removed") removed += words(part.text);
        else if (part.kind === "added") added += words(part.text);
      }
  }
  return { removed, added };
}
