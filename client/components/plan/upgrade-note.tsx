"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { SparklesIcon as Sparkles } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { usePlanFeature } from "@/hooks/use-plan-limit";
import type { PlanFeature } from "@/lib/plans";

/**
 * A one-line "this is on Lite" note with a link to upgrade. Renders nothing
 * when the plan already has the feature, so callers can drop it in freely.
 */
export function UpgradeNote({ feature, className, children }: { feature: PlanFeature; className?: string; children?: React.ReactNode }) {
  const { allowed, requiredPlan, label } = usePlanFeature(feature);
  if (allowed) return null;
  return (
    <p className={cn("flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-muted-foreground", className)}>
      <HugeiconsIcon icon={Sparkles} strokeWidth={2} className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span>{children ?? `${label} ${requiredPlan ? `is on ${requiredPlan} and up.` : "isn't on your plan."}`}</span>
      <Link href="/app/settings/billing" className="font-medium text-primary hover:underline">
        See plans
      </Link>
    </p>
  );
}
