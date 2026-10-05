import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon as ArrowRight, Tick02Icon as Tick } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { WHATS_NEW_KIND_LABEL, type WhatsNewCardData, type WhatsNewKind } from "@/lib/whats-new";

const KIND_STYLE: Record<WhatsNewKind, string> = {
  new: "bg-primary/10 text-primary",
  improved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  upcoming: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
};

/**
 * One "What's new" card: an optional image, what kind of news it is, a
 * title, a paragraph, a few points and one button. Used by the landing
 * page's popup and by the admin page's live preview, so what an admin sees
 * while writing is what visitors get.
 */
export function WhatsNewCard({
  item,
  onAction,
  className,
}: {
  item: Pick<WhatsNewCardData, "kind" | "title" | "body" | "bullets" | "imageUrl" | "ctaLabel" | "ctaUrl">;
  /** Called when the card's button is used, so the popup can close. */
  onAction?: () => void;
  className?: string;
}) {
  const hasCta = item.ctaLabel && item.ctaUrl;
  const external = hasCta && /^https?:\/\//i.test(item.ctaUrl!);
  const ctaClass =
    "mt-5 inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25";

  return (
    <article className={cn("flex flex-col", className)}>
      {item.imageUrl && (
        <div className="aspect-[16/9] w-full shrink-0 overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element -- admin-supplied image from any host */}
          <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <div className="flex flex-col p-6">
        <span className={cn("w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide", KIND_STYLE[item.kind])}>
          {WHATS_NEW_KIND_LABEL[item.kind]}
        </span>
        <h3 className="mt-3 text-xl font-semibold leading-snug tracking-tight text-balance text-foreground">{item.title || "Untitled"}</h3>
        {item.body && <p className="mt-2 text-[15px] leading-relaxed text-pretty text-muted-foreground">{item.body}</p>}

        {item.bullets.length > 0 && (
          <ul className="mt-4 space-y-2">
            {item.bullets.map((bullet, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[14px] leading-snug text-foreground">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <HugeiconsIcon icon={Tick} strokeWidth={3} className="h-2.5 w-2.5" />
                </span>
                {bullet}
              </li>
            ))}
          </ul>
        )}

        {hasCta &&
          (external ? (
            <a href={item.ctaUrl!} target="_blank" rel="noreferrer" onClick={onAction} className={cn(ctaClass, "w-fit")}>
              {item.ctaLabel}
              <HugeiconsIcon icon={ArrowRight} strokeWidth={2.25} className="h-4 w-4" />
            </a>
          ) : (
            <Link href={item.ctaUrl!} onClick={onAction} className={cn(ctaClass, "w-fit")}>
              {item.ctaLabel}
              <HugeiconsIcon icon={ArrowRight} strokeWidth={2.25} className="h-4 w-4" />
            </Link>
          ))}
      </div>
    </article>
  );
}
