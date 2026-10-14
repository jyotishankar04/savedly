"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  AiMagicIcon,
  BubbleChatIcon,
  CommandLineIcon,
  Database01Icon,
  Download04Icon,
  FileUploadIcon,
  FlashIcon,
  FolderLibraryIcon,
  GithubIcon as Github,
  Layers01Icon,
  Leaf01Icon,
  Rocket01Icon,
  ServerStack01Icon,
  Settings01Icon,
  Share08Icon,
  Tick02Icon as Tick,
} from "@hugeicons/core-free-icons";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { CopyCommand } from "@/components/copy-command";
import { cn } from "@/lib/utils";
import { HeroReveal } from "@/components/marketing/motion/hero-reveal";
import { Reveal } from "@/components/marketing/motion/reveal";
import { GITHUB_URL, INSTALL_COMMAND } from "@/lib/open-source";
import { useCurrentUserQuery } from "@/context/UserContext";
import { getServerConfig } from "@/lib/server-config";
import {
  formatLimitValue,
  formatMoneyMinor,
  formatPriceMinor,
  getMyPlan,
  listPublicPlans,
  planFeatureBullets,
  planTier,
  type PlanLimitType,
  PLAN_TIER_TAGLINE,
  startCheckout,
  type PublicPlan,
} from "@/lib/plans";

// Short card taglines per tier; anything else falls back to the plan's own description.
const TAGLINES: Record<string, string> = {
  ...PLAN_TIER_TAGLINE,
};

/** What every plan has: the Free card's list. */
const ESSENTIALS = ["Search by meaning", "Ask your library", "Collections and tags", "Sharing by link", "Import and export"];

/** Every limit a plan has, one row each, in the order they read best. Values come from the server. */
const ROWS: { type: PlanLimitType; label: string; icon: IconSvgElement; tint: string }[] = [
  { type: "memory_count", label: "Memories", icon: FolderLibraryIcon, tint: "text-sky-500" },
  { type: "storage_mb", label: "Storage", icon: Database01Icon, tint: "text-violet-500" },
  { type: "ai_monthly_saves", label: "Saves read by AI / month", icon: AiMagicIcon, tint: "text-emerald-500" },
  { type: "ai_monthly_queries", label: "Ask questions / month", icon: BubbleChatIcon, tint: "text-amber-500" },
  { type: "max_file_mb", label: "Largest file", icon: FileUploadIcon, tint: "text-pink-500" },
  { type: "collection_count", label: "Collections", icon: Layers01Icon, tint: "text-teal-500" },
  { type: "public_share_count", label: "Public share links", icon: Share08Icon, tint: "text-indigo-500" },
  { type: "import_monthly_count", label: "Imports / month", icon: Download04Icon, tint: "text-orange-500" },
];

const TIER_MARK: Record<string, { icon: IconSvgElement; tint: string }> = {
  free: { icon: Leaf01Icon, tint: "text-sky-500" },
  lite: { icon: FlashIcon, tint: "text-orange-500" },
  ai: { icon: Rocket01Icon, tint: "text-violet-500" },
};

/** A plan's limit table. null, or a limit the plan doesn't have, is unlimited. */
function limitRows(plan: PublicPlan): CardRow[] {
  return ROWS.map((row) => {
    const value = plan.limits[row.type];
    return { label: row.label, icon: row.icon, tint: row.tint, value: value == null ? "Unlimited" : formatLimitValue(row.type, value) };
  });
}

const FACTS = [
  { value: "AGPL-3.0", label: "Open source" },
  { value: "Free plan", label: "No card needed" },
  { value: "No AI keys", label: "We supply the AI" },
  { value: "1 command", label: "To self-host" },
];

const FAQ = [
  {
    q: "Is Savedly free?",
    a: "Yes. The hosted Free plan has the essentials and some AI we supply each month, with no card required. Self-hosting is free too, with every feature and no limits. Lite and Pro add more room, more AI and more features.",
  },
  {
    q: "What's the difference between Cloud and self-hosted?",
    a: "On Cloud we run it for you: nothing to install, updates and backups are ours to handle. Self-hosted runs on your own computer or server with one command; your data never leaves it, and every feature is unlimited.",
  },
  {
    q: "What is included AI?",
    a: "Savedly reads, summarizes, tags and files what you save, and answers your questions. That needs an AI model. With included AI we run it on our own account, up to your plan's monthly allowance, so you don't need an AI key of your own. AI processing counts each item you save once, however many steps it takes, reading images included. Ask questions have their own allowance.",
  },
  {
    q: "Do I need my own AI key?",
    a: "No. On every hosted plan we supply the AI, so there's nothing to set up. If you'd rather use your own key from OpenAI, Anthropic, Google Gemini, Groq, OpenRouter or any OpenAI-compatible service, self-host Savedly: it's free, and your own key is never limited.",
  },
  {
    q: "What happens when I reach a limit?",
    a: "Nothing breaks. When included AI runs out, new saves are still stored, just without AI processing until next month or until you upgrade. At the storage limit only new file uploads stop. Your existing library is never deleted.",
  },
  {
    q: "How do I pay, and can I cancel?",
    a: "Payments go through Dodo Payments, our merchant of record, which also handles sales tax, VAT or GST. You can pay by card, or with UPI in India. Cancel any time from Settings; you keep the paid plan until the end of the period you paid for.",
  },
  {
    q: "What license is Savedly under?",
    a: "The code is open source under AGPL-3.0. You can use, change and self-host it freely. If you run a modified version as a public service, you share your changes under the same license.",
  },
];

type Tab = "cloud" | "self";

function formatPerMonth(plan: PublicPlan): { price: string; per: string | null; note: string | null } {
  if (plan.priceMinor <= 0) return { price: "Coming soon", per: null, note: null };
  if (plan.billingInterval === "yearly") {
    return {
      price: formatPriceMinor(Math.round(plan.priceMinor / 12), plan.currency),
      per: "per month",
      note: `Billed yearly at ${formatPriceMinor(plan.priceMinor, plan.currency)}`,
    };
  }
  return { price: formatPriceMinor(plan.priceMinor, plan.currency), per: "per month", note: null };
}

/**
 * The plans the server actually offers (GET /plans — active plans only), plus
 * self-hosting. A plan without a price yet shows "Price coming soon" and
 * can't be bought, so this page never advertises a price that doesn't exist.
 */
export function PricingPlans() {
  const router = useRouter();
  const { data: user } = useCurrentUserQuery();
  const { data: config } = useQuery({ queryKey: ["server-config"], queryFn: getServerConfig });
  const { data: plans, isLoading } = useQuery({ queryKey: ["plans", "public"], queryFn: listPublicPlans });
  const { data: myPlan } = useQuery({ queryKey: ["plans", "me"], queryFn: getMyPlan, enabled: !!user });
  const [tab, setTab] = useState<Tab>("cloud");
  const [pending, setPending] = useState<string | null>(null);

  // A subscriber is only offered plans above theirs (sortOrder: Lite monthly
  // < Lite yearly < AI included monthly < AI included yearly) — the server
  // refuses anything else. Their own plan stays, marked current.
  const current = myPlan && !myPlan.plan.isDefault ? myPlan.plan : null;

  // Someone on a monthly plan sees the yearly view first: that's the move up.
  const [yearlyChoice, setYearlyChoice] = useState<boolean | null>(null);
  const yearly = yearlyChoice ?? current?.billingInterval === "monthly";

  const { free, paid, hasYearly, savingPct } = useMemo(() => {
    const all = plans ?? [];
    const paidPlans = all.filter((p) => !p.isDefault && (!current || p.sortOrder >= current.sortOrder));
    const tiers = [...new Set(paidPlans.map((p) => planTier(p.key)))];
    // The saving is computed from real prices, and only shown when both are set.
    const savings = tiers
      .map((tier) => {
        const monthly = paidPlans.find((p) => planTier(p.key) === tier && p.billingInterval === "monthly");
        const annual = paidPlans.find((p) => planTier(p.key) === tier && p.billingInterval === "yearly");
        return monthly && annual && monthly.priceMinor > 0 && annual.priceMinor > 0
          ? Math.round((1 - annual.priceMinor / (monthly.priceMinor * 12)) * 100)
          : 0;
      })
      .filter((pct) => pct > 0);
    const interval = yearly ? "yearly" : "monthly";
    return {
      free: all.find((p) => p.isDefault) ?? null,
      hasYearly: paidPlans.some((p) => p.billingInterval === "yearly"),
      savingPct: savings.length ? Math.max(...savings) : 0,
      paid: tiers.map((tier) => {
        const variants = paidPlans.filter((p) => planTier(p.key) === tier);
        return variants.find((p) => p.billingInterval === interval) ?? variants[0];
      }),
    };
  }, [plans, yearly, current]);

  // Free, Lite and AI included side by side; a subscriber may have fewer left.
  const cardCount = tab === "cloud" ? (free && !current ? 1 : 0) + paid.length : 2;

  async function buy(plan: PublicPlan) {
    if (!user) {
      router.push("/auth/signup");
      return;
    }
    // A subscriber's upgrade charges their saved card at once, so it's
    // confirmed in Settings, where the exact amount is shown first.
    if (current) {
      router.push(`/app/settings/billing?upgrade=${encodeURIComponent(plan.key)}`);
      return;
    }
    setPending(plan.key);
    try {
      window.location.assign(await startCheckout(plan.key));
    } catch (err) {
      toast.add({ title: err instanceof Error ? err.message : "Couldn't start checkout.", type: "error" });
      setPending(null);
    }
  }

  if (config?.selfHosted) {
    return (
      <section className="px-5 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center space-y-4">
          <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">This is a self-hosted install</h1>
          <p className="text-lg text-muted-foreground">Every feature is free and unlimited here. There&apos;s nothing to buy.</p>
        </div>
      </section>
    );
  }

  const freeName = free?.name ?? "Free";

  return (
    <div className="px-5 sm:px-6">
      {/* Heading */}
      <HeroReveal as="section" className="mx-auto max-w-6xl pt-16 pb-12 md:pt-24">
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end lg:gap-16">
          <h1 className="font-serif text-[clamp(2.5rem,6vw,4.5rem)] font-medium leading-[1.04] tracking-[-0.03em] text-foreground">Pricing</h1>
          <p data-hero-after className="max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground lg:justify-self-end">
            Start free with AI we supply, move up for more room and features, or run it yourself for free with everything unlocked.
          </p>
        </div>

        <dl data-hero-after className="mt-12 grid grid-cols-2 border-t border-foreground/15 lg:grid-cols-4">
          {FACTS.map((fact) => (
            <div key={fact.label} className="border-b border-foreground/15 py-6 pr-4">
              <dt className="sr-only">{fact.label}</dt>
              <dd className="font-serif text-2xl font-medium tracking-[-0.02em] text-foreground">{fact.value}</dd>
              <dd className="mt-1 text-sm text-muted-foreground">{fact.label}</dd>
            </div>
          ))}
        </dl>
      </HeroReveal>

      {/* Plans */}
      <section id="plans" className="mx-auto max-w-6xl scroll-mt-24 pb-20">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <div className="inline-flex w-fit rounded-2xl bg-muted p-1 text-sm font-medium" role="tablist" aria-label="How to run it">
              {(
                [
                  ["cloud", "Savedly Cloud"],
                  ["self", "Self-hosted"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={tab === value}
                  onClick={() => setTab(value)}
                  className={cn(
                    "rounded-xl px-5 py-2 transition-colors",
                    tab === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {tab === "cloud" ? "We host it. Nothing to install." : "Your server, your data. Free, with every feature."}
            </p>
          </div>

          {tab === "cloud" && hasYearly && (
            <label className="inline-flex cursor-pointer items-center gap-3 text-sm text-muted-foreground">
              <span>
                Billed yearly
                {savingPct > 0 && <span className="ml-1.5 font-medium text-primary">Save up to {savingPct}%</span>}
              </span>
              <Switch checked={yearly} onCheckedChange={setYearlyChoice} aria-label="Billed yearly" />
            </label>
          )}
        </div>

        {tab === "cloud" && current && (
          <p className="mt-5 text-sm text-muted-foreground">
            You&apos;re on <span className="font-medium text-foreground">{current.name}</span> (
            {current.billingInterval === "yearly" ? "yearly" : "monthly"}).{" "}
            {(plans ?? []).some((p) => !p.isDefault && p.priceMinor > 0 && p.sortOrder > current.sortOrder)
              ? "Here's what's above it. Moving up changes your current subscription and charges only the difference."
              : "That's our biggest plan."}{" "}
            To move to a smaller plan or cancel, use{" "}
            <Link href="/app/settings/billing" className="text-primary hover:underline">
              Manage billing
            </Link>
            .
          </p>
        )}

        <div className={cn("mt-8 grid gap-4", cardCount === 1 ? "max-w-md" : cardCount === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3")}>
          {tab === "cloud" ? (
            <>
              {isLoading && (
                <div className="flex min-h-[28rem] items-center justify-center rounded-3xl text-muted-foreground ring-1 ring-foreground/[0.08] md:col-span-2 lg:col-span-3">
                  <Spinner />
                </div>
              )}

              {free && !current && (
                <PlanCard
                  name={free.name}
                  mark={TIER_MARK.free}
                  tagline={TAGLINES.free}
                  price={formatMoneyMinor(0, free.currency)}
                  per="forever"
                  rows={limitRows(free)}
                  groups={[{ label: null, items: [...ESSENTIALS, ...planFeatureBullets(free.features)] }]}
                  action={
                    <Link href={user ? "/app" : "/auth/signup"} className={cn(buttonClass, quietButton)}>
                      {user ? "Go to your library" : "Get started"}
                    </Link>
                  }
                />
              )}

              {paid.map((plan, i) => {
                const { price, per, note } = formatPerMonth(plan);
                const below = i === 0 ? free : paid[i - 1];
                const isCurrent = plan.key === current?.key;
                const buyable = !!config?.billing && plan.priceMinor > 0 && !isCurrent;
                return (
                  <PlanCard
                    key={plan.key}
                    name={plan.name}
                    mark={TIER_MARK[planTier(plan.key)]}
                    tagline={TAGLINES[planTier(plan.key)] ?? plan.description ?? ""}
                    price={price}
                    per={per}
                    priceNote={note}
                    rows={limitRows(plan)}
                    // Each card builds on the one below it: Lite on Free, Pro on Lite.
                    groups={[{ label: `Everything in ${below?.name ?? freeName} +`, items: planFeatureBullets(plan.features, below?.features) }]}
                    action={
                      <button type="button" onClick={() => buy(plan)} disabled={pending !== null || !buyable} className={cn(buttonClass, i === 0 && paid.length > 1 ? strongButton : quietButton)}>
                        {pending === plan.key && <Spinner />}
                        {isCurrent ? "Current plan" : buyable ? "Upgrade" : "Coming soon"}
                      </button>
                    }
                  />
                );
              })}
            </>
          ) : (
            <>
              <PlanCard
                name="Community"
                mark={{ icon: ServerStack01Icon, tint: "text-sky-500" }}
                tagline="Your server, AGPL-3.0 license."
                price={"$0"}
                per="forever"
                groups={[
                  {
                    label: "Included:",
                    items: [
                      "Every feature, with no limits",
                      "As many accounts as you like",
                      "Your storage: local disk, R2, S3 or MinIO",
                      "Your AI key, or one key for everyone",
                      "Google and GitHub sign-in, optional",
                    ],
                  },
                ]}
                action={
                  <Link href="/help/docs/self-host/self-host" className={cn(buttonClass, strongButton)}>
                    Read the self-host guide
                  </Link>
                }
              />

              <PlanCard
                name="Install"
                mark={{ icon: CommandLineIcon, tint: "text-orange-500" }}
                tagline="Any machine with Docker and Git."
                price="One command"
                groups={[]}
                body={
                  <div className="space-y-4">
                    <CopyCommand command={INSTALL_COMMAND} wrap />
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Or clone the repository and run <code className="font-mono text-[13px] text-foreground">docker compose up -d</code>. Then
                      open <code className="font-mono text-[13px] text-foreground">http://localhost:3000</code> and create your admin account.
                    </p>
                  </div>
                }
                action={
                  <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className={cn(buttonClass, quietButton)}>
                    <HugeiconsIcon icon={Github} strokeWidth={2} className="h-4 w-4" />
                    View on GitHub
                  </a>
                }
              />

              <PlanCard
                name="Configure"
                mark={{ icon: Settings01Icon, tint: "text-violet-500" }}
                tagline="From the admin page, or with env vars."
                price="No .env needed"
                groups={[
                  {
                    label: "Works out of the box, change any time:",
                    items: [
                      "File storage: local disk by default",
                      "Vector store: built-in Postgres (pgvector)",
                      "Email: off until you add SMTP",
                      "Embeddings key for the whole install",
                      "Secrets generated on first start",
                    ],
                  },
                ]}
                action={
                  <Link href="/help/docs/self-host/self-host#configure" className={cn(buttonClass, quietButton)}>
                    See configuration
                  </Link>
                }
              />
            </>
          )}
        </div>
      </section>

      {/* FAQ */}
      <Reveal>
      <section className="mx-auto max-w-6xl pb-8 pt-8">
        <h2 className="font-serif text-[clamp(2rem,4vw,3rem)] font-medium leading-[1.08] tracking-[-0.025em] text-foreground">Questions about pricing</h2>
        <Accordion className="mt-8 rounded-3xl border-foreground/10">
          {FAQ.map((item) => (
            <AccordionItem key={item.q} value={item.q} className="border-foreground/10 data-open:bg-transparent">
              <AccordionTrigger className="px-5 py-4 text-[15px] font-medium hover:no-underline">{item.q}</AccordionTrigger>
              <AccordionContent className="px-5 text-[15px] leading-relaxed text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <p className="mt-8 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Prices include applicable taxes, handled by our payment provider (merchant of record).
        </p>
      </section>
      </Reveal>
    </div>
  );
}

const buttonClass =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-full px-5 text-[15px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:opacity-60";
/** The one card the row is built around. */
const strongButton = "bg-primary text-primary-foreground hover:bg-primary/90";
const quietButton = "bg-foreground/[0.06] text-foreground hover:bg-foreground/10";

interface CardRow {
  label: string;
  value: string;
  icon: IconSvgElement;
  tint: string;
}

/**
 * One plan, in the same shape as the landing page's cards: its name and
 * price, a table of its limits, what it adds, and one button.
 */
function PlanCard({
  name,
  mark,
  tagline,
  price,
  per,
  priceNote,
  rows,
  groups,
  body,
  action,
}: {
  name: string;
  mark?: { icon: IconSvgElement; tint: string };
  tagline: string;
  price: string;
  per?: string | null;
  priceNote?: string | null;
  rows?: CardRow[];
  groups: { label: string | null; items: string[] }[];
  body?: React.ReactNode;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-3xl bg-card p-6 ring-1 ring-foreground/[0.08] sm:p-7">
      <div className="flex items-center gap-2">
        {mark && <HugeiconsIcon icon={mark.icon} strokeWidth={2} className={cn("h-[18px] w-[18px]", mark.tint)} />}
        <h3 className="text-base font-medium text-foreground">{name}</h3>
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">{tagline}</p>

      <p className="mt-5 flex items-baseline gap-1.5">
        <span className="text-4xl font-semibold tracking-[-0.03em] text-foreground">{price}</span>
        {per && <span className="text-sm text-muted-foreground">{per}</span>}
      </p>
      {/* Always a line tall, so cards with and without a note keep their rows level. */}
      <p className="mt-1 h-5 text-sm text-muted-foreground">{priceNote}</p>

      {rows && (
        <dl className="mt-5 space-y-3">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 text-sm">
              <dt className="flex min-w-0 items-center gap-2.5 text-muted-foreground">
                <HugeiconsIcon icon={row.icon} strokeWidth={2} className={cn("h-4 w-4 shrink-0", row.tint)} />
                <span className="truncate">{row.label}</span>
              </dt>
              <dd className="shrink-0 font-medium tabular-nums text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* Grows to fill the card, so the buttons line up whatever the lists hold. */}
      <div className={cn("flex-1 space-y-4 pb-7", rows ? "mt-6 border-t border-foreground/10 pt-5" : "mt-5")}>
        {groups.map((group) => (
          <div key={group.label ?? "included"}>
            {group.label && <p className="mb-3 text-sm text-muted-foreground">{group.label}</p>}
            <ul className="space-y-3">
              {group.items.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-foreground">
                  <HugeiconsIcon icon={Tick} strokeWidth={2.25} className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {body}
      </div>

      {action}
    </div>
  );
}
