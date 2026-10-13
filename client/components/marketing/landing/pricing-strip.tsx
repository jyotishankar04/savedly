"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  AiMagicIcon,
  BubbleChatIcon,
  Database01Icon,
  FileUploadIcon,
  FlashIcon,
  FolderLibraryIcon,
  Leaf01Icon,
  Rocket01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { useAuthCta } from "@/hooks/use-auth-cta";
import { formatLimitValue, formatMoneyMinor, listPublicPlans, planFeatureBullets, planTier, type PlanLimitType, type PublicPlan } from "@/lib/plans";
import { cn } from "@/lib/utils";

// The hosted plans side by side, before someone goes looking for the pricing
// page. Every number and feature line is the server's (GET /plans, the same
// source as /pricing and what the app enforces), so a card can't promise
// something a plan doesn't give. If the request fails, no cards are shown:
// the link to the pricing page is still there.

/** The limits worth a row on a card, with the colour of their icon. */
const ROWS: { type: PlanLimitType; label: string; icon: IconSvgElement; tint: string }[] = [
  { type: "memory_count", label: "Memories", icon: FolderLibraryIcon, tint: "text-sky-500" },
  { type: "storage_mb", label: "Storage", icon: Database01Icon, tint: "text-violet-500" },
  { type: "ai_monthly_saves", label: "Saves read by AI / month", icon: AiMagicIcon, tint: "text-emerald-500" },
  { type: "ai_monthly_queries", label: "Ask questions / month", icon: BubbleChatIcon, tint: "text-amber-500" },
  { type: "max_file_mb", label: "Largest file", icon: FileUploadIcon, tint: "text-pink-500" },
];

const TIER_ICON: Record<string, { icon: IconSvgElement; tint: string }> = {
  free: { icon: Leaf01Icon, tint: "text-sky-500" },
  lite: { icon: FlashIcon, tint: "text-orange-500" },
  ai: { icon: Rocket01Icon, tint: "text-violet-500" },
};

/** What every plan has, the Free card's list. From the pricing page's own "essentials". */
const ESSENTIALS = ["Search by meaning", "Ask your library", "Collections and tags", "Sharing by link", "Import and export"];

interface Card {
  plan: PublicPlan;
  tier: string;
  /** "Everything in Free +", or null on the first card. */
  buildsOn: string | null;
  features: string[];
}

/** One card per tier, from its monthly plan, each listing what it adds to the one before. */
function cards(plans: PublicPlan[] | undefined): Card[] {
  const monthly = (plans ?? []).filter((p) => p.isDefault || (p.billingInterval === "monthly" && p.priceMinor > 0)).sort((a, b) => a.sortOrder - b.sortOrder);
  return monthly.map((plan, i) => {
    const below = monthly[i - 1];
    return {
      plan,
      tier: planTier(plan.key),
      buildsOn: below ? `Everything in ${below.name} +` : null,
      // Every feature the plan adds, none left out. The first card lists what
      // every plan has, then whatever the plan itself switches on.
      features: below ? planFeatureBullets(plan.features, below.features) : [...ESSENTIALS, ...planFeatureBullets(plan.features)],
    };
  });
}

function limitValue(plan: PublicPlan, type: PlanLimitType): string {
  const value = plan.limits[type];
  // null is a limit the plan doesn't cap at all; a missing key is the same on the server.
  return value == null ? "Unlimited" : formatLimitValue(type, value);
}

function PlanCard({ card, highlight, signupHref }: { card: Card; highlight: boolean; signupHref: string }) {
  const { plan, tier } = card;
  const mark = TIER_ICON[tier] ?? TIER_ICON.free;
  const free = plan.isDefault;
  return (
    <div className="flex flex-col rounded-3xl bg-card p-6 ring-1 ring-foreground/[0.08] sm:p-7">
      <div className="flex items-center gap-2">
        <HugeiconsIcon icon={mark.icon} strokeWidth={2} className={cn("h-[18px] w-[18px]", mark.tint)} />
        <h3 className="text-base font-medium text-foreground">{plan.name}</h3>
      </div>

      <p className="mt-4 flex items-baseline gap-1.5">
        <span className="text-4xl font-semibold tracking-[-0.03em] text-foreground">{formatMoneyMinor(plan.priceMinor, plan.currency)}</span>
        <span className="text-sm text-muted-foreground">{free ? "forever" : "per month"}</span>
      </p>

      <dl className="mt-6 space-y-3">
        {ROWS.map((row) => (
          <div key={row.type} className="flex items-center justify-between gap-4 text-sm">
            <dt className="flex min-w-0 items-center gap-2.5 text-muted-foreground">
              <HugeiconsIcon icon={row.icon} strokeWidth={2} className={cn("h-4 w-4 shrink-0", row.tint)} />
              <span className="truncate">{row.label}</span>
            </dt>
            <dd className="shrink-0 font-medium tabular-nums text-foreground">{limitValue(plan, row.type)}</dd>
          </div>
        ))}
      </dl>

      {/* Grows to fill the card, so the three buttons line up whatever the lists hold. */}
      <div className="mt-6 flex-1 border-t border-foreground/10 pt-5 pb-7">
        {card.buildsOn && <p className="mb-3 text-sm text-muted-foreground">{card.buildsOn}</p>}
        <ul className="space-y-3">
          {card.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-sm text-foreground">
              <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.25} className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <Link
        href={free ? signupHref : "/pricing"}
        className={cn(
          "inline-flex h-10 w-full shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
          highlight ? "bg-foreground text-background hover:bg-foreground/85" : "bg-foreground/[0.06] text-foreground hover:bg-foreground/10",
        )}
      >
        {free ? "Get started" : `Choose ${plan.name}`}
      </Link>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-3xl bg-card p-6 ring-1 ring-foreground/[0.08] sm:p-7" aria-hidden>
      <div className="h-5 w-20 rounded bg-foreground/[0.07]" />
      <div className="mt-5 h-9 w-28 rounded bg-foreground/[0.07]" />
      <div className="mt-7 space-y-3.5">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="h-4 rounded bg-foreground/[0.07]" style={{ width: `${92 - (i % 3) * 14}%` }} />
        ))}
      </div>
      <div className="mt-7 h-10 rounded-full bg-foreground/[0.07]" />
    </div>
  );
}

export function PricingStrip() {
  const cta = useAuthCta();
  const { data: plans, isLoading, isError } = useQuery({ queryKey: ["plans", "public"], queryFn: listPublicPlans });
  const list = isError ? [] : cards(plans);
  // The middle of three is the one the row is built around; with fewer plans, none is singled out.
  const highlighted = list.length === 3 ? 1 : -1;

  return (
    <section id="pricing" className="scroll-mt-24 bg-background px-5 py-20 font-sans antialiased sm:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-serif text-[clamp(2rem,4vw,3rem)] font-medium leading-[1.08] tracking-[-0.025em] text-foreground">Pricing</h2>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">Start free, upgrade when you need more.</p>

        {(isLoading || list.length > 0) && (
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-busy={isLoading}>
            {isLoading
              ? Array.from({ length: 3 }, (_, i) => <CardSkeleton key={i} />)
              : list.map((card, i) => <PlanCard key={card.plan.key} card={card} highlight={i === highlighted} signupHref={cta.href} />)}
          </div>
        )}

        <p className="mt-8 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          On every plan we supply the AI, so there are no keys to set up. Prefer to run it yourself? Self-hosting is free, with every feature and no limits.{" "}
          <Link href="/pricing" className="font-medium text-foreground underline decoration-foreground/25 underline-offset-4 hover:decoration-foreground">
            Compare plans in full
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
