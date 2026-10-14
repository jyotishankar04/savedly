import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon as ArrowRight, Tick02Icon as Tick } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { WHATS_NEW_KIND_LABEL, type WhatsNewCardData, type WhatsNewKind } from "@/lib/whats-new";

const KIND_STYLE: Record<WhatsNewKind, string> = {
  feature: "text-primary",
  new: "text-primary",
  improved: "text-emerald-600 dark:text-emerald-400",
  upcoming: "text-amber-700 dark:text-amber-400",
};

/**
 * One "What's new" card: an optional image, what kind of news it is, a
 * title, a paragraph, a few points and one button. Used by the landing
 * page's popup and by the admin page's live preview, so what an admin sees
 * while writing is what visitors get. Set in the landing page's type: a
 * serif title over plain text.
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
    "mt-5 inline-flex h-11 w-fit items-center gap-2 rounded-full bg-primary pr-4 pl-5 text-[15px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30";
  const cta = (
    <>
      {item.ctaLabel}
      <HugeiconsIcon icon={ArrowRight} strokeWidth={2.25} className="h-4 w-4" />
    </>
  );

  return (
    <article className={cn("flex flex-col", className)}>
      {item.imageUrl && (
        // Edge to edge, and fading out into the words below it. The picture
        // itself turns transparent toward the bottom, so it blends into
        // whatever is behind the card (the popup's glass, or a plain card).
        <div className="relative aspect-[16/9] w-full overflow-hidden [mask-image:linear-gradient(to_bottom,black_50%,transparent)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- admin-supplied image from any host */}
          <img src={item.imageUrl} alt="" className="h-full w-full object-cover object-top" />
        </div>
      )}

      <div className={cn("flex flex-col px-5 pb-6 sm:px-7 sm:pb-7", item.imageUrl ? "-mt-10 relative pt-0" : "pt-8")}>
        <span className={cn("inline-flex w-fit items-center gap-2 text-[13px] font-medium", KIND_STYLE[item.kind])}>
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
          {WHATS_NEW_KIND_LABEL[item.kind]}
        </span>
        {/* Room on the right for the popup's close button when there is no image above. */}
        <h3 className={cn("mt-2.5 font-serif text-[1.5rem] leading-[1.12] sm:mt-3 sm:text-[1.75rem] font-medium tracking-[-0.02em] text-balance text-foreground", !item.imageUrl && "pr-10")}>
          {item.title || "Untitled"}
        </h3>
        {item.body && <p className="mt-3 text-[15px] leading-relaxed text-pretty text-muted-foreground">{item.body}</p>}

        {item.bullets.length > 0 && (
          <ul className="mt-4 divide-y divide-foreground/10 border-y border-foreground/10">
            {item.bullets.map((bullet, i) => (
              <li key={i} className="flex items-start gap-3 py-2.5 text-[14.5px] leading-snug text-foreground">
                <HugeiconsIcon icon={Tick} strokeWidth={2.5} className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {bullet}
              </li>
            ))}
          </ul>
        )}

        {hasCta &&
          (external ? (
            <a href={item.ctaUrl!} target="_blank" rel="noreferrer" onClick={onAction} className={ctaClass}>
              {cta}
            </a>
          ) : (
            <Link href={item.ctaUrl!} onClick={onAction} className={ctaClass}>
              {cta}
            </Link>
          ))}
      </div>
    </article>
  );
}
