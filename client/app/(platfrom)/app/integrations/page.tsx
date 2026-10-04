"use client";

import React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ChromeIcon,
  CheckmarkCircle02Icon as CheckCircle,
  Search01Icon as SearchIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCalendarConnectUrl, type CalendarProviderKey } from "@/lib/calendar-api";
import { useCalendarConnectionsQuery, useDisconnectCalendarMutation } from "@/hooks/use-calendar";
import { cn } from "@/lib/utils";
import { usePlanFeature } from "@/hooks/use-plan-limit";
import { ProBadge } from "@/components/plan-limit-notice";

/** Official Google "G" mark — small enough that a colored circle badge alone wouldn't read as Google. */
function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.1-11.3-7.5l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.2 5.2C39.9 36.9 44 31 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}

type Category = "Calendar" | "Coming soon";
const CATEGORIES: Category[] = ["Calendar", "Coming soon"];

interface CardMeta {
  key: string;
  title: string;
  description: string;
  category: Category;
  connected: boolean;
}

/** Distinct per-state pill — the whole point of "different buttons for different connectors" is that connected/available/coming-soon read differently at a glance, not just by label text. */
function ConnectPill({
  state,
  children,
  ...props
}: { state: "connected" | "available" | "coming-soon" | "action" } & React.ComponentProps<typeof Button>) {
  if (state === "connected") {
    return (
      <Button
        size="sm"
        variant="outline"
        className={cn("h-7 rounded-full border-primary/40 bg-primary/10 px-3 text-[10px] font-bold text-primary hover:bg-primary/15", props.className)}
        {...props}
      >
        <HugeiconsIcon icon={CheckCircle} strokeWidth={2.25} className="h-3 w-3" /> {children}
      </Button>
    );
  }
  if (state === "coming-soon") {
    return (
      <Button disabled variant="outline" size="sm" className={cn("h-7 rounded-full px-3 text-[10px] font-bold opacity-60", props.className)}>
        {children}
      </Button>
    );
  }
  if (state === "action") {
    return (
      <Button size="sm" className={cn("h-7 rounded-full px-3 text-[10px] font-bold", props.className)} {...props}>
        {children}
      </Button>
    );
  }
  return (
    <Button
      size="sm"
      variant="outline"
      className={cn("h-7 rounded-full px-3 text-[10px] font-bold hover:border-primary/40 hover:text-primary", props.className)}
      {...props}
    >
      {children}
    </Button>
  );
}

function CategoryTag({ category }: { category: Category }) {
  return (
    <span className="inline-flex w-fit items-center rounded-full bg-muted px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
      {category}
    </span>
  );
}

function IntegrationCard({
  iconBg,
  icon,
  title,
  connected,
  category,
  description,
  action,
}: {
  iconBg: string;
  icon: React.ReactNode;
  title: string;
  connected: boolean;
  category: Category;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full", iconBg)}>{icon}</div>

      <h3 className="mt-3 flex items-center gap-1 text-xs font-bold text-foreground">
        {title}
        {connected && (
          <HugeiconsIcon
            icon={CheckCircle}
            strokeWidth={2.25}
            className="h-3.5 w-3.5 shrink-0 text-primary"
            aria-label="Connected"
          />
        )}
      </h3>
      <div className="mt-1">
        <CategoryTag category={category} />
      </div>
      <p className="mt-2 flex-1 text-[11px] leading-relaxed text-muted-foreground">{description}</p>

      <div className="mt-3">{action}</div>
    </div>
  );
}

function UpgradePill({ plan }: { plan: string | null }) {
  return (
    <Link href="/app/settings/billing" className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-primary hover:underline">
      <ProBadge label={plan} />
      Upgrade to connect
    </Link>
  );
}

export default function IntegrationsPage() {
  const [query, setQuery] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState<Category | "All">("All");

  const { data: calendarConnections } = useCalendarConnectionsQuery();
  // Connecting a calendar is a plan feature; an existing connection keeps
  // working and can always be disconnected.
  const googleSync = usePlanFeature("calendarSync");
  const disconnectMutation = useDisconnectCalendarMutation();
  function isCalendarConnected(provider: CalendarProviderKey): boolean {
    return calendarConnections?.some((c) => c.provider === provider) ?? false;
  }

  const cardMeta: CardMeta[] = [
    { key: "google-calendar", title: "Google Calendar", description: "Sync detected and manually added events straight to your Google Calendar.", category: "Calendar", connected: isCalendarConnected("google") },
    { key: "browser-extension", title: "Browser extension", description: "Quick-capture from any tab with a keyboard shortcut. Not yet published to the Chrome Web Store.", category: "Coming soon", connected: false },
  ];

  const q = query.trim().toLowerCase();
  const visible = new Set(
    cardMeta
      .filter((c) => activeCategory === "All" || c.category === activeCategory)
      .filter((c) => !q || c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q))
      .map((c) => c.key),
  );
  const visibleCount = visible.size;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 animate-fade-in">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
          <p className="mt-1 text-xs text-muted-foreground" aria-live="polite">
            {visibleCount} of {cardMeta.length} connectors {activeCategory !== "All" || q ? "matching" : "available"}
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <label htmlFor="integration-search" className="sr-only">
            Search integrations
          </label>
          <HugeiconsIcon
            icon={SearchIcon}
            strokeWidth={2.25}
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="integration-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search integrations…"
            className="h-9 pl-8 text-xs"
          />
        </div>
      </div>

      <div role="group" aria-label="Filter by category" className="mb-6 flex flex-wrap gap-1.5">
        {(["All", ...CATEGORIES] as const).map((category) => (
          <button
            key={category}
            type="button"
            aria-pressed={activeCategory === category}
            onClick={() => setActiveCategory(category)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              activeCategory === category
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {category}
          </button>
        ))}
      </div>

      {visibleCount === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-xs text-muted-foreground">No integrations match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.has("google-calendar") && (
            <IntegrationCard
              iconBg="bg-white border border-border"
              icon={<GoogleLogo className="h-6 w-6" />}
              title="Google Calendar"
              category="Calendar"
              connected={isCalendarConnected("google")}
              description={cardMeta[0].description}
              action={
                isCalendarConnected("google") ? (
                  <div className="flex items-center gap-2">
                    <ConnectPill state="connected" render={<Link href="/app/calendar" />} nativeButton={false}>
                      Manage
                    </ConnectPill>
                    <button
                      type="button"
                      disabled={disconnectMutation.isPending}
                      onClick={() => disconnectMutation.mutate("google")}
                      className="text-[10px] font-semibold text-muted-foreground hover:text-destructive"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  googleSync.allowed ? (
                    <ConnectPill state="available" render={<a href={getCalendarConnectUrl("google")} />} nativeButton={false}>
                      Connect
                    </ConnectPill>
                  ) : (
                    <UpgradePill plan={googleSync.requiredPlan} />
                  )
                )
              }
            />
          )}

          {visible.has("browser-extension") && (
            <IntegrationCard
              iconBg="bg-amber-500"
              icon={<HugeiconsIcon icon={ChromeIcon} strokeWidth={2.25} className="h-4.5 w-4.5 text-white" />}
              title="Browser extension"
              category="Coming soon"
              connected={false}
              description={cardMeta[1].description}
              action={<ConnectPill state="coming-soon">Coming soon</ConnectPill>}
            />
          )}

        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
}
