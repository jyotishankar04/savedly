import { eq } from "drizzle-orm";
import { db } from "../../db";
import { billingCustomers } from "../../db/schema";
import { env } from "../../config/env";
import { AppError } from "../../shared/errors/app-error";
import { logger } from "../../shared/utils/logger";
import type { BillingProvider } from "./billing.provider";
import { createDodoProvider } from "./dodo.provider";

// Paid plans for the hosted service. Never active on a self-hosted install
// (the routes aren't even mounted — see routes/index.ts).

export const SUBSCRIPTION_REF = "dodo_subscription";

let provider: BillingProvider | null | undefined;

export function getProvider(): BillingProvider | null {
  if (provider !== undefined) return provider;
  provider =
    !env.SELF_HOSTED && env.BILLING_PROVIDER === "dodo" && env.DODO_PAYMENTS_API_KEY ? createDodoProvider() : null;
  return provider;
}

export function isBillingEnabled(): boolean {
  return !!getProvider();
}

/** Provider API failures (outage, bad key) surface as one readable 502, with the detail in the log. */
export async function callProvider<T>(what: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    logger.error({ err }, `[billing] ${what} failed`);
    // A 4xx is the provider refusing the request (e.g. changing a cancelled
    // subscription), not an outage — say why instead of "try again".
    const status = (err as { status?: number }).status;
    if (status && status >= 400 && status < 500) {
      const reason = String((err as Error).message ?? "").replace(/^\d{3}\s*/, "").trim();
      throw new AppError(
        reason ? `The payment provider couldn't do that: ${reason}.` : "The payment provider couldn't do that.",
        409,
        "BILLING_REQUEST_REJECTED",
      );
    }
    throw new AppError("The payment provider isn't responding. Please try again in a minute.", 502, "BILLING_PROVIDER_ERROR");
  }
}

export function requireProvider(): BillingProvider {
  const p = getProvider();
  if (!p) throw new AppError("Billing isn't set up on this server", 503, "BILLING_NOT_CONFIGURED");
  return p;
}

export async function customerIdFor(userId: string): Promise<string | null> {
  const [row] = await db.select().from(billingCustomers).where(eq(billingCustomers.userId, userId)).limit(1);
  return row?.customerId ?? null;
}
