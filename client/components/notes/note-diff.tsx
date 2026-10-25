"use client";

import { useMemo } from "react";
import { diffCounts, diffText } from "@/lib/word-diff";
import { cn } from "@/lib/utils";

const REMOVED = "rounded-[3px] bg-red-500/15 px-px text-red-700 line-through decoration-red-600 decoration-[1.5px] dark:text-red-300 dark:decoration-red-300";
const ADDED = "rounded-[3px] bg-emerald-500/15 px-px text-emerald-800 no-underline dark:text-emerald-300";

/**
 * A line's Markdown marker as it looks in the note: a box for a to-do, a dot
 * for a bullet, a bulb for a callout; a heading loses its #s and is set bold.
 */
function display(text: string): { text: string; heading: boolean } {
  const heading = /^#{1,6} /.exec(text);
  if (heading) return { text: text.slice(heading[0].length), heading: true };
  return {
    text: text
      .replace(/^(\s*)- \[ \] /, "$1☐ ")
      .replace(/^(\s*)- \[[xX]\] /, "$1☑ ")
      .replace(/^(\s*)[-*+] /, "$1• ")
      .replace(/^> \[!NOTE\]$/i, "💡 Callout")
      .replace(/^> ?/, "│ "),
    heading: false,
  };
}

/**
 * Two versions of a note, the changes marked as in a word diff: removed words
 * struck through in red, added ones in green, untouched text dimmed. Lines are
 * shown as written (Markdown), so a changed heading or to-do shows as one.
 */
export function NoteDiff({ before, after }: { before: string; after: string }) {
  const lines = useMemo(() => diffText(before.trim(), after.trim()), [before, after]);
  const counts = useMemo(() => diffCounts(lines), [lines]);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {counts.removed === 0 && counts.added === 0 ? (
          "Only spacing and punctuation changed."
        ) : (
          <>
            <span className="font-medium text-red-600 dark:text-red-400">{counts.removed === 1 ? "1 word removed" : `${counts.removed} words removed`}</span>
            {", "}
            <span className="font-medium text-emerald-700 dark:text-emerald-400">{counts.added === 1 ? "1 added" : `${counts.added} added`}</span>
          </>
        )}
      </p>
      <div className="space-y-1 text-[15px] leading-7 [overflow-wrap:anywhere]">
        {lines.map((line, index) => {
          if (line.kind === "same") {
            const shown = display(line.text);
            return line.text.trim() ? (
              <p key={index} className={cn("whitespace-pre-wrap text-muted-foreground/80", shown.heading && "font-semibold")}>
                {shown.text}
              </p>
            ) : (
              <div key={index} className="h-2" aria-hidden />
            );
          }
          if (line.kind !== "changed") {
            if (!line.text.trim()) return <div key={index} className="h-2" aria-hidden />;
            return (
              <p key={index} className="flex gap-2 whitespace-pre-wrap">
                <span aria-hidden className={cn("w-3 shrink-0 select-none text-center font-mono", line.kind === "added" ? "text-emerald-600" : "text-red-500")}>
                  {line.kind === "added" ? "+" : "−"}
                </span>
                {line.kind === "added" ? <ins className={ADDED}>{display(line.text).text}</ins> : <del className={REMOVED}>{display(line.text).text}</del>}
              </p>
            );
          }
          // The marker sits in the line's first, unchanged part.
          const lead = line.parts[0]?.kind === "same" ? display(line.parts[0].text) : null;
          return (
            <p key={index} className={cn("whitespace-pre-wrap text-foreground", lead?.heading && "font-semibold")}>
              {line.parts.map((part, i) =>
                part.kind === "same" ? (
                  <span key={i}>{i === 0 && lead ? lead.text : part.text}</span>
                ) : part.kind === "removed" ? (
                  <del key={i} className={REMOVED}>
                    {part.text}
                  </del>
                ) : (
                  <ins key={i} className={ADDED}>
                    {part.text}
                  </ins>
                ),
              )}
            </p>
          );
        })}
      </div>
    </div>
  );
}
