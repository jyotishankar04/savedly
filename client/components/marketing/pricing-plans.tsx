"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon as Tick, ArrowRight01Icon as ArrowRight } from "@hugeicons/core-free-icons";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { GITHUB_URL } from "@/lib/open-source";
import { useCurrentUserQuery } from "@/context/UserContext";
import { getServerConfig } from "@/lib/server-config";
import { formatPriceMinor, listPublicPlans, planLimitBullets, planTier, startCheckout, type PublicPlan } from "@/lib/plans";

type Interval = "monthly" | "yearly";

const SELF_HOST_BULLETS = [
  "Every feature, unlimited",
  "One command: docker compose up -d",
  "Your storage, database and AI key",
  "Open source (AGPL-3.0)",
];

/**
 * The plans the server actually offers (GET /plans — active plans only), plus
 * self-hosting. A paid plan an admin hasn't priced and activated simply
 * doesn't appear, so this page can't advertise anything that isn't for sale.
 */
export function PricingPlans() {
  const router = useRouter();
  const { data: user } = useCurrentUserQuery();
  const { data: config } = useQuery({ queryKey: ["server-config"], queryFn: getServerConfig });
  const { data: plans, isLoading } = useQuery({ queryKey: ["plans", "public"], queryFn: listPublicPlans });
  const [interval, setInterval] = useState<Interval>("monthly");
  const [pending, setPending] = useState<string | null>(null);

  const { free, paid, hasYearly } = useMemo(() => {
    const all = plans ?? [];
    const paidPlans = all.filter((p) => p.priceMinor > 0);
    return {
      free: all.find((p) => p.priceMinor === 0 && p.isDefault) ?? null,
      hasYearly: paidPlans.some((p) => p.billingInterval === "yearly"),
      // One card per tier, showing the chosen interval (falling back to the other).
      paid: [...new Set(paidPlans.map((p) => planTier(p.key)))].map((tier) => {
        const variants = paidPlans.filter((p) => planTier(p.key) === tier);
        return variants.find((p) => p.billingInterval === interval) ?? variants[0];
      }),
    };
  }, [plans, interval]);

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

  return (
    <section className="px-5 py-16 sm:px-6 md:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <h1 className="text-3xl leading-[1.08] font-semibold tracking-[-0.03em] text-balance sm:text-[2.75rem]">
            Run it yourself, or let us run it.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-pretty text-muted-foreground">
            Every plan has every feature. They differ only in how much you can store and whether we supply the AI.
          </p>
        </div>

        {hasYearly && (
          <div className="mt-10 inline-flex rounded-full bg-muted p-1 text-sm font-medium" role="group" aria-label="Billing period">
            {(["monthly", "yearly"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setInterval(value)}
                aria-pressed={interval === value}
                className={cn(
                  "rounded-full px-4 py-1.5 transition-colors",
                  interval === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {value === "monthly" ? "Monthly" : "Yearly"}
              </button>
            ))}
          </div>
        )}

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
          <PlanCard
            name="Self-host"
            price="Free"
            period="forever"
            description="Run it on your own computer or server."
            bullets={SELF_HOST_BULLETS}
            cta={
              <a href={`${GITHUB_URL}/blob/main/docs/SELF_HOSTING.md`} target="_blank" rel="noopener noreferrer" className={secondaryCta}>
                Read the guide <HugeiconsIcon icon={ArrowRight} strokeWidth={2} className="h-4 w-4" />
              </a>
            }
          />

          {isLoading && (
            <div className="flex items-center justify-center rounded-2xl ring-1 ring-foreground/10 p-6 text-muted-foreground">
              <Spinner />
            </div>
          )}

          {free && (
            <PlanCard
              name={free.name}
              price="Free"
              period="hosted"
              description={free.description ?? ""}
              bullets={planLimitBullets(free.limits)}
              cta={
                <Link href={user ? "/app" : "/auth/signup"} className={secondaryCta}>
                  {user ? "Go to your library" : "Start free"}
                </Link>
              }
            />
          )}

          {paid.map((plan, i) => (
            <PlanCard
              key={plan.key}
              name={plan.name}
              price={formatPriceMinor(plan.priceMinor, plan.currency)}
              period={plan.billingInterval === "yearly" ? "per year" : "per month"}
              description={plan.description ?? ""}
              bullets={planLimitBullets(plan.limits)}
              highlighted={i === paid.length - 1}
              cta={
                <button
                  type="button"
                  onClick={() => buy(plan)}
                  disabled={pending !== null || !config?.billing}
                  className={primaryCta}
                >
                  {pending === plan.key && <Spinner />}
                  {config?.billing ? `Get ${plan.name}` : "Coming soon"}
                </button>
              }
            />
          ))}
        </div>

        <p className="mt-8 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Prices include applicable taxes, handled by our payment provider (merchant of record). Cancel any time from Settings; you
          keep the paid plan until the end of the period you paid for.
        </p>
      </div>
    </section>
  );
}

const primaryCta =
  "inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60";
const secondaryCta =
  "inline-flex h-10 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-medium text-foreground ring-1 ring-foreground/15 transition-colors hover:bg-muted";

function PlanCard({
  name,
  price,
  period,
  description,
  bullets,
  cta,
  highlighted = false,
}: {
  name: string;
  price: string;
  period: string;
  description: string;
  bullets: string[];
  cta: React.ReactNode;
  highlighted?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl p-6 ring-1",
        highlighted ? "ring-primary/40 bg-primary/[0.03]" : "ring-foreground/10 bg-card",
      )}
    >
      <h2 className="text-base font-semibold text-foreground">{name}</h2>
      <p className="mt-3 flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold tracking-[-0.02em] tabular-nums">{price}</span>
        <span className="text-sm text-muted-foreground">{period}</span>
      </p>
      <p className="mt-3 min-h-[2.75rem] text-sm leading-relaxed text-muted-foreground">{description}</p>
      <ul className="mt-5 flex-1 space-y-2.5 text-sm">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex gap-2.5 text-foreground">
            <HugeiconsIcon icon={Tick} strokeWidth={2.25} className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {bullet}
          </li>
        ))}
      </ul>
      <div className="mt-6">{cta}</div>
    </div>
  );
}
