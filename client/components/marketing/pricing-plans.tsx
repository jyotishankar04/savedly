"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon as Tick, GithubIcon as Github } from "@hugeicons/core-free-icons";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { CopyCommand } from "@/components/copy-command";
import { cn } from "@/lib/utils";
import { GITHUB_URL } from "@/lib/open-source";
import { useCurrentUserQuery } from "@/context/UserContext";
import { getServerConfig } from "@/lib/server-config";
import { formatPriceMinor, getMyPlan, listPublicPlans, planLimitBullets, planTier, startCheckout, type PublicPlan } from "@/lib/plans";

// Short card taglines per tier; anything else falls back to the plan's own description.
const TAGLINES: Record<string, string> = {
  free: "For everyone, on your own AI key.",
  "own-key": "More room. You bring the AI key.",
  ai: "More room, and we supply the AI.",
};

const EVERY_FEATURE = "Every feature: capture, search by meaning, Ask, vault, sharing, import and export";
const INSTALL_COMMAND = "curl -fsSL https://raw.githubusercontent.com/jyotishankar04/saveforlatter/main/install.sh | sh";

const FACTS = [
  { value: "AGPL-3.0", label: "Open source" },
  { value: "Every feature", label: "On every plan" },
  { value: "Your AI key", label: "Never limited" },
  { value: "1 command", label: "To self-host" },
];

const FAQ = [
  {
    q: "Is SaveForLatter free?",
    a: "Yes. The hosted Free plan has every feature on your own AI key, with no card required. Self-hosting is free too, with no limits at all. Paid plans only add more storage and AI we supply.",
  },
  {
    q: "What's the difference between Cloud and self-hosted?",
    a: "On Cloud we run it for you: nothing to install, updates and backups are ours to handle. Self-hosted runs on your own computer or server with one command; your data never leaves it, and every feature is unlimited.",
  },
  {
    q: "What is included AI?",
    a: "SaveForLatter reads, summarizes, tags and files what you save, and answers your questions. That needs an AI model. With included AI we run it on our own account, up to your plan's monthly allowance, so you don't need an AI key of your own.",
  },
  {
    q: "Is my own AI key limited?",
    a: "No. Add a key from OpenAI, Anthropic, Google Gemini, Groq, OpenRouter or any OpenAI-compatible service in Settings, and it's used instead of included AI, with no limits on any plan.",
  },
  {
    q: "What happens when I reach a limit?",
    a: "Nothing breaks. When included AI runs out, new saves are still stored, just without AI processing until next month or until you add your own key. At the storage limit only new file uploads stop. Your existing library is never deleted.",
  },
  {
    q: "How do I pay, and can I cancel?",
    a: "Payments go through Dodo Payments, our merchant of record, which also handles sales tax, VAT or GST. You can pay by card, or with UPI in India. Cancel any time from Settings; you keep the paid plan until the end of the period you paid for.",
  },
  {
    q: "What license is SaveForLatter under?",
    a: "The code is open source under AGPL-3.0. You can use, change and self-host it freely. If you run a modified version as a public service, you share your changes under the same license.",
  },
];

type Tab = "cloud" | "self";

function formatPerMonth(plan: PublicPlan): { price: string; note: string | null } {
  if (plan.priceMinor <= 0) return { price: "Price coming soon", note: null };
  if (plan.billingInterval === "yearly") {
    return {
      price: `${formatPriceMinor(Math.round(plan.priceMinor / 12), plan.currency)} per month`,
      note: `Billed yearly at ${formatPriceMinor(plan.priceMinor, plan.currency)}`,
    };
  }
  return { price: `${formatPriceMinor(plan.priceMinor, plan.currency)} per month`, note: null };
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

  // A subscriber is only offered plans above theirs (sortOrder: Own key
  // monthly < Own key yearly < AI included monthly < AI included yearly) —
  // the server refuses anything else. Their own plan stays, marked current.
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

  async function buy(plan: PublicPlan) {
    if (!user) {
      router.push("/auth/signup");
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

  const showSelfHosted = () => {
    setTab("self");
    document.getElementById("plans")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
      {/* Hero */}
      <section className="mx-auto max-w-6xl pt-12 pb-14 md:pt-20">
        <h1 className="max-w-3xl text-4xl leading-[1.04] font-semibold tracking-[-0.035em] text-balance sm:text-6xl">
          Pricing for your second brain
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">
          Free on your own AI key, more room and AI we supply on paid plans, or run it yourself for free. Every plan has every feature.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="#plans"
            className="inline-flex h-11 items-center rounded-lg bg-primary px-6 text-[15px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            See plans
          </a>
          <button
            type="button"
            onClick={showSelfHosted}
            className="inline-flex h-11 items-center rounded-lg px-6 text-[15px] font-medium text-foreground ring-1 ring-foreground/15 transition-colors hover:bg-muted"
          >
            Self-host SaveForLatter
          </button>
        </div>

        <dl className="mt-16 grid grid-cols-2 overflow-hidden rounded-2xl ring-1 ring-foreground/10 lg:grid-cols-4">
          {FACTS.map((fact, i) => (
            <div
              key={fact.label}
              className={cn(
                "px-6 py-7 text-center",
                i % 2 === 1 && "border-l border-foreground/10",
                i >= 2 && "border-t border-foreground/10 lg:border-t-0",
                i === 2 && "lg:border-l",
              )}
            >
              <dt className="sr-only">{fact.label}</dt>
              <dd className="text-2xl font-semibold tracking-[-0.02em] text-foreground">{fact.value}</dd>
              <dd className="mt-1 text-sm text-muted-foreground">{fact.label}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Plans */}
      <section id="plans" className="mx-auto max-w-6xl scroll-mt-24 pb-16">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <div className="inline-flex w-fit rounded-xl bg-muted p-1 text-sm font-medium" role="tablist" aria-label="How to run it">
              {(
                [
                  ["cloud", "SaveForLatter Cloud"],
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
                    "rounded-lg px-5 py-2 transition-colors",
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

        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {tab === "cloud" ? (
            <>
              {isLoading && (
                <div className="flex min-h-[28rem] items-center justify-center rounded-2xl ring-1 ring-foreground/10 text-muted-foreground lg:col-span-3">
                  <Spinner />
                </div>
              )}

              {free && !current && (
                <PlanCard
                  name={free.name}
                  tagline={TAGLINES.free}
                  price="Free forever"
                  groups={[{ label: `Included in ${free.name}:`, items: [EVERY_FEATURE, ...planLimitBullets(free.limits)] }]}
                  action={
                    <Link href={user ? "/app" : "/auth/signup"} className={buttonClass}>
                      {user ? "Go to your library" : "Get started"}
                    </Link>
                  }
                />
              )}

              {paid.map((plan) => {
                const { price, note } = formatPerMonth(plan);
                const isCurrent = plan.key === current?.key;
                const buyable = !!config?.billing && plan.priceMinor > 0 && !isCurrent;
                return (
                  <PlanCard
                    key={plan.key}
                    name={plan.name}
                    tagline={TAGLINES[planTier(plan.key)] ?? plan.description ?? ""}
                    price={price}
                    priceNote={note}
                    groups={[{ label: `Included in ${plan.name}:`, items: [`Everything in ${freeName}`, ...planLimitBullets(plan.limits)] }]}
                    action={
                      <button type="button" onClick={() => buy(plan)} disabled={pending !== null || !buyable} className={buttonClass}>
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
                tagline="Your server, AGPL-3.0 license."
                price="Free forever"
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
                  <Link href="/help/self-host" className={buttonClass}>
                    Read the self-host guide
                  </Link>
                }
              />

              <PlanCard
                name="Install"
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
                  <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className={buttonClass}>
                    <HugeiconsIcon icon={Github} strokeWidth={2} className="h-4 w-4" />
                    View on GitHub
                  </a>
                }
              />

              <PlanCard
                name="Configure"
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
                  <Link href="/help/self-host#configure" className={buttonClass}>
                    See configuration
                  </Link>
                }
              />
            </>
          )}
        </div>
      </section>

      {/* Support */}
      <section className="mx-auto max-w-6xl pb-20">
        <div className="grid gap-6 rounded-2xl p-8 ring-1 ring-foreground/10 md:grid-cols-[1fr_auto] md:items-center md:p-10">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.02em]">Like SaveForLatter? Help keep it running.</h2>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
              It&apos;s built in the open. A contribution, a bug report or a star on GitHub helps as much as a paid plan.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/contribute" className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
              Contribute
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-lg px-5 text-sm font-medium text-foreground ring-1 ring-foreground/15 transition-colors hover:bg-muted"
            >
              <HugeiconsIcon icon={Github} strokeWidth={2} className="h-4 w-4" />
              Star on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-6xl pb-24">
        <h2 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Frequently asked questions</h2>
        <Accordion className="mt-8 rounded-2xl border-foreground/10">
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
    </div>
  );
}

const buttonClass =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-[15px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60";

function PlanCard({
  name,
  tagline,
  price,
  priceNote,
  groups,
  body,
  action,
}: {
  name: string;
  tagline: string;
  price: string;
  priceNote?: string | null;
  groups: { label: string; items: string[] }[];
  body?: React.ReactNode;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
      {/* Header band: name, tagline, price */}
      <div className="border-b border-foreground/10 bg-foreground/[0.025] px-6 py-6">
        <h3 className="text-lg font-semibold text-foreground">{name}</h3>
        <p className="mt-0.5 text-[15px] text-muted-foreground">{tagline}</p>
        <p className="mt-5 text-3xl font-semibold tracking-[-0.02em] text-foreground">{price}</p>
        <p className="mt-1 h-5 text-sm text-muted-foreground">{priceNote}</p>
      </div>

      {/* Body: grouped inclusions */}
      <div className="flex flex-1 flex-col px-6 py-5">
        <div className="flex-1 space-y-4">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="text-sm text-muted-foreground">{group.label}</p>
              <ul className="mt-2.5 space-y-2.5">
                {group.items.map((item) => (
                  <li key={item} className="flex gap-2.5 text-[15px] leading-snug text-foreground">
                    <HugeiconsIcon icon={Tick} strokeWidth={2.25} className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {body}
        </div>
        <div className="mt-8">{action}</div>
      </div>
    </div>
  );
}
