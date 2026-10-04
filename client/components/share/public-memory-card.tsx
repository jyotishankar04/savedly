import { HugeiconsIcon } from "@hugeicons/react";
import { CompassIcon as Compass, ExternalLinkIcon as ExternalLink } from "@hugeicons/core-free-icons";
import { MEMORY_TYPE_ICONS } from "@/lib/memory-icons";
import { timeAgo } from "@/lib/time";
import type { SharedMemoryItem } from "@/lib/shares";

/**
 * One saved item on a shared page. Lifted out of the old /c/[slug] page so
 * the collection and single-memory views render items identically.
 *
 * `nofollow` on the outbound link is deliberate: a public share page can be
 * indexed when its owner opts in, and we don't want to pass authority to
 * arbitrary URLs a stranger happened to save.
 */
export function PublicMemoryCard({ item }: { item: SharedMemoryItem }) {
  const Icon = MEMORY_TYPE_ICONS[item.type] ?? Compass;
  const body = item.description || item.content;

  const card = (
    <div className="h-full rounded-xl border border-border/60 bg-card p-4 space-y-2 transition-colors hover:border-primary/30">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
          <HugeiconsIcon icon={Icon} strokeWidth={2.25} className="h-3 w-3" />
          {item.type}
        </span>
        {item.url && (
          <HugeiconsIcon icon={ExternalLink} strokeWidth={2.25} className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </div>
      <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{item.title}</h3>
      {body && <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{body}</p>}
      <p className="pt-1 font-mono text-[10px] text-muted-foreground/70">{timeAgo(item.createdAt)}</p>
    </div>
  );

  return item.url ? (
    <a href={item.url} target="_blank" rel="noopener noreferrer nofollow">
      {card}
    </a>
  ) : (
    card
  );
}
