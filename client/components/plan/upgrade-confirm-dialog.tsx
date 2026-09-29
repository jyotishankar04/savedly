"use client";

import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { CreditCardIcon as Card } from "@hugeicons/core-free-icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/auth";
import { formatPriceMinor, previewUpgrade } from "@/lib/plans";

/**
 * Someone who already pays moves up in place, and the provider charges
 * their saved card the moment they confirm: there's no payment page. So
 * this asks the provider what it will charge and shows that first.
 */
export function UpgradeConfirmDialog({
  planKey,
  busy,
  onConfirm,
  onClose,
}: {
  planKey: string | null;
  busy: boolean;
  onConfirm: (planKey: string) => void;
  onClose: () => void;
}) {
  const { data: preview, isLoading, error } = useQuery({
    queryKey: ["billing", "upgrade-preview", planKey],
    queryFn: () => previewUpgrade(planKey!),
    enabled: !!planKey,
    // The prorated amount shrinks as the period runs; never show a stale one.
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

  const change = preview?.mode === "change" ? preview : null;
  const owes = !!change && change.chargeNowMinor > 0;
  const chargeNow = owes ? formatPriceMinor(change!.chargeNowMinor, change!.currency) : null;
  const renewal = change ? formatPriceMinor(change.renewalMinor, change.renewalCurrency) : null;
  const per = change?.billingInterval === "yearly" ? "a year" : "a month";

  return (
    <AlertDialog open={!!planKey} onOpenChange={(open) => !open && !busy && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia tone="primary">
            <HugeiconsIcon icon={Card} strokeWidth={2} />
          </AlertDialogMedia>
          <AlertDialogTitle>{change ? `Upgrade to ${change.planName}?` : "Upgrade your plan?"}</AlertDialogTitle>
          <AlertDialogDescription render={<div />}>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Spinner /> Working out what you&apos;d pay…
              </span>
            ) : error ? (
              <span className="text-destructive">
                {error instanceof ApiError ? error.message : "Couldn't work out the price right now. Try again in a moment."}
              </span>
            ) : change ? (
              <span className="block space-y-3 text-left">
                <span className="block">
                  {owes ? (
                    <>
                      Your saved card is charged <strong className="text-foreground">{chargeNow}</strong> now: the difference from{" "}
                      {change.fromPlanName} for the rest of this billing period
                      {change.taxMinor && change.taxMinor > 0 ? ", tax included" : ""}.
                    </>
                  ) : (
                    <>Nothing to pay now: what&apos;s left of your {change.fromPlanName} plan covers it.</>
                  )}{" "}
                  After that, {change.planName} renews at{" "}
                  <strong className="text-foreground">
                    {renewal} {per}
                  </strong>
                  .
                </span>
                <span className="block text-xs">You can cancel or move to a smaller plan any time from Manage billing.</span>
              </span>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Not now</AlertDialogCancel>
          <AlertDialogAction disabled={!change || busy} onClick={() => planKey && onConfirm(planKey)}>
            {busy && <Spinner />}
            {chargeNow ? `Pay ${chargeNow} and upgrade` : "Upgrade"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
