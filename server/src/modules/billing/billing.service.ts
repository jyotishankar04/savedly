import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "../../db";
import { billingCustomers, billingEvents, plans, userPlanAssignments, users } from "../../db/schema";
import { PlanAssignmentSource, PlanAssignmentStatus } from "../../db/enums";
import { env } from "../../config/env";
import { AppError } from "../../shared/errors/app-error";
import { logger } from "../../shared/utils/logger";
import type { BillingProvider, SubscriptionEvent } from "./billing.provider";
import { createDodoProvider } from "./dodo.provider";

// Paid plans for the hosted service. Never active on a self-hosted install
// (the routes aren't even mounted — see routes/index.ts).

const SUBSCRIPTION_REF = "dodo_subscription";
// Access runs a little past the billing date so a renewal that lands a few
// hours late never flickers someone back to Free.
const RENEWAL_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

let provider: BillingProvider | null | undefined;

function getProvider(): BillingProvider | null {
  if (provider !== undefined) return provider;
  provider =
    !env.SELF_HOSTED && env.BILLING_PROVIDER === "dodo" && env.DODO_PAYMENTS_API_KEY ? createDodoProvider() : null;
  return provider;
}

export function isBillingEnabled(): boolean {
  return !!getProvider();
}

/** Provider API failures (outage, bad key) surface as one readable 502, with the detail in the log. */
async function callProvider<T>(what: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    logger.error({ err }, `[billing] ${what} failed`);
    throw new AppError("The payment provider isn't responding. Please try again in a minute.", 502, "BILLING_PROVIDER_ERROR");
  }
}

function requireProvider(): BillingProvider {
  const p = getProvider();
  if (!p) throw new AppError("Billing isn't set up on this server", 503, "BILLING_NOT_CONFIGURED");
  return p;
}

async function customerIdFor(userId: string): Promise<string | null> {
  const [row] = await db.select().from(billingCustomers).where(eq(billingCustomers.userId, userId)).limit(1);
  return row?.customerId ?? null;
}

export async function createCheckout(userId: string, planKey: string): Promise<{ url: string }> {
  const billing = requireProvider();

  const [plan] = await db.select().from(plans).where(eq(plans.key, planKey)).limit(1);
  const productId = env.DODO_PRODUCT_IDS[planKey];
  if (!plan || !plan.isActive || plan.priceMinor <= 0 || !productId) {
    throw new AppError("That plan isn't available to buy", 404, "PLAN_NOT_AVAILABLE");
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new AppError("User not found", 404, "NOT_FOUND");

  const base = `${env.FRONTEND_URL.replace(/\/$/, "")}/app/settings/billing`;
  const customerId = await customerIdFor(userId);
  return callProvider("checkout", () =>
    billing.createCheckout({
      productId,
      user: { id: user.id, email: user.email, name: user.name },
      customerId,
      returnUrl: `${base}?checkout=success`,
      cancelUrl: `${base}?checkout=cancelled`,
    }),
  );
}

export async function createPortalLink(userId: string): Promise<{ url: string }> {
  const billing = requireProvider();
  const customerId = await customerIdFor(userId);
  if (!customerId) throw new AppError("You don't have a subscription to manage yet", 404, "NO_SUBSCRIPTION");
  return { url: await callProvider("portal", () => billing.customerPortalUrl(customerId)) };
}

async function resolveUser(event: SubscriptionEvent): Promise<string | null> {
  if (event.userId) {
    const [byId] = await db.select({ id: users.id }).from(users).where(eq(users.id, event.userId)).limit(1);
    if (byId) return byId.id;
  }
  const [byCustomer] = await db
    .select({ userId: billingCustomers.userId })
    .from(billingCustomers)
    .where(eq(billingCustomers.customerId, event.customerId))
    .limit(1);
  if (byCustomer) return byCustomer.userId;
  if (event.customerEmail) {
    const [byEmail] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, event.customerEmail.toLowerCase()))
      .limit(1);
    if (byEmail) return byEmail.id;
  }
  return null;
}

function planKeyForProduct(productId: string): string | null {
  return Object.entries(env.DODO_PRODUCT_IDS).find(([, id]) => id === productId)?.[0] ?? null;
}

/**
 * Verifies and applies one provider webhook. Idempotent on the delivery id:
 * a replayed or duplicated event is recorded once and applied once.
 */
export async function handleWebhook(rawBody: string, headers: Record<string, string>): Promise<void> {
  const billing = requireProvider();

  let event: SubscriptionEvent | null;
  try {
    event = billing.parseWebhook(rawBody, headers);
  } catch (err) {
    logger.warn({ err }, "[billing] rejected webhook with a bad signature");
    throw new AppError("Invalid webhook signature", 401, "INVALID_SIGNATURE");
  }
  if (!event) return; // an event type billing doesn't act on

  const [fresh] = await db
    .insert(billingEvents)
    .values({ id: event.eventId, provider: billing.name, type: event.type })
    .onConflictDoNothing()
    .returning({ id: billingEvents.id });
  if (!fresh) return; // already handled

  const userId = await resolveUser(event);
  if (!userId) {
    logger.error({ subscriptionId: event.subscriptionId, customerId: event.customerId }, "[billing] no user for subscription");
    return;
  }

  await db
    .insert(billingCustomers)
    .values({ userId, provider: billing.name, customerId: event.customerId })
    .onConflictDoUpdate({ target: billingCustomers.userId, set: { customerId: event.customerId, provider: billing.name } });

  const planKey = planKeyForProduct(event.productId);
  const [plan] = planKey ? await db.select().from(plans).where(eq(plans.key, planKey)).limit(1) : [];
  if (!plan) {
    logger.error({ productId: event.productId }, "[billing] product isn't mapped to a plan in DODO_PRODUCT_IDS");
    return;
  }

  await applySubscriptionEvent(userId, plan.id, event);
  logger.info({ userId, plan: plan.key, type: event.type }, "[billing] subscription event applied");
}

async function applySubscriptionEvent(userId: string, planId: string, event: SubscriptionEvent): Promise<void> {
  const now = new Date();

  await db.transaction(async (tx) => {
    // Providers often send several events for one subscription at the same
    // instant (Dodo sends subscription.active and .renewed together).
    // Serializing per subscription stops two handlers from both seeing "no
    // assignment yet" and inserting one each.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`billing:${event.subscriptionId}`}))`);

    const refMatch = and(
      eq(userPlanAssignments.userId, userId),
      eq(userPlanAssignments.sourceRefType, SUBSCRIPTION_REF),
      eq(userPlanAssignments.sourceRefId, event.subscriptionId),
    );
    const [current] = await tx.select().from(userPlanAssignments).where(refMatch).limit(1);

    switch (event.kind) {
      case "active": {
        const endsAt = event.periodEnd ? new Date(event.periodEnd.getTime() + RENEWAL_GRACE_MS) : null;
        if (current) {
          await tx.update(userPlanAssignments).set({ planId, status: PlanAssignmentStatus.ACTIVE, endsAt }).where(refMatch);
        } else {
          // A new subscription replaces any other subscription-bought plan
          // (e.g. switching from Own key to AI included).
          await tx
            .update(userPlanAssignments)
            .set({ status: PlanAssignmentStatus.SUPERSEDED, endsAt: now })
            .where(
              and(
                eq(userPlanAssignments.userId, userId),
                eq(userPlanAssignments.source, PlanAssignmentSource.SUBSCRIPTION),
                eq(userPlanAssignments.status, PlanAssignmentStatus.ACTIVE),
                ne(userPlanAssignments.sourceRefId, event.subscriptionId),
              ),
            );
          await tx.insert(userPlanAssignments).values({
            userId,
            planId,
            status: PlanAssignmentStatus.ACTIVE,
            source: PlanAssignmentSource.SUBSCRIPTION,
            startsAt: now,
            endsAt,
            sourceRefType: SUBSCRIPTION_REF,
            sourceRefId: event.subscriptionId,
          });
        }
        return;
      }
      case "past_due":
        // The provider is retrying the charge; access continues until the
        // assignment's endsAt (period end + grace).
        return;
      case "cancelled": {
        if (!current) return;
        // Paid-for time is kept: access runs to the end of the period.
        const endsAt = event.periodEnd && event.periodEnd > now ? event.periodEnd : now;
        await tx
          .update(userPlanAssignments)
          .set({ endsAt, status: endsAt > now ? PlanAssignmentStatus.ACTIVE : PlanAssignmentStatus.CANCELLED })
          .where(refMatch);
        return;
      }
      case "ended": {
        if (!current) return;
        await tx.update(userPlanAssignments).set({ status: PlanAssignmentStatus.EXPIRED, endsAt: now }).where(refMatch);
        return;
      }
    }
  });
}
