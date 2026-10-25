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

/** The payment provider this server is set up with (or none), and the calls that go through it. */
export class BillingGateway {
  private provider: BillingProvider | null | undefined;

  get(): BillingProvider | null {
    if (this.provider !== undefined) return this.provider;
    this.provider =
      !env.SELF_HOSTED && env.BILLING_PROVIDER === "dodo" && env.DODO_PAYMENTS_API_KEY ? createDodoProvider() : null;
    return this.provider;
  }

  isEnabled(): boolean {
    return !!this.get();
  }

  require(): BillingProvider {
    const p = this.get();
    if (!p) throw new AppError("Billing isn't set up on this server", 503, "BILLING_NOT_CONFIGURED");
    return p;
  }

  /** Provider API failures (outage, bad key) surface as one readable 502, with the detail in the log. */
  async call<T>(what: string, fn: () => Promise<T>): Promise<T> {
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

  async customerIdFor(userId: string): Promise<string | null> {
    const [row] = await db.select().from(billingCustomers).where(eq(billingCustomers.userId, userId)).limit(1);
    return row?.customerId ?? null;
  }
}

const gateway = new BillingGateway();

export const getProvider = () => gateway.get();
export const isBillingEnabled = () => gateway.isEnabled();
export const requireProvider = () => gateway.require();
export const callProvider = <T>(what: string, fn: () => Promise<T>) => gateway.call(what, fn);
export const customerIdFor = (userId: string) => gateway.customerIdFor(userId);
