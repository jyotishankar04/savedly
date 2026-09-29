import { and, desc, eq, gte, ne, sql } from "drizzle-orm";
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

function requireProvider(): BillingProvider {
  const p = getProvider();
  if (!p) throw new AppError("Billing isn't set up on this server", 503, "BILLING_NOT_CONFIGURED");
  return p;
}

async function customerIdFor(userId: string): Promise<string | null> {
  const [row] = await db.select().from(billingCustomers).where(eq(billingCustomers.userId, userId)).limit(1);
  return row?.customerId ?? null;
}

/** The user's live, provider-billed subscription and its plan, if they have one. */
async function currentSubscription(userId: string) {
  const [row] = await db
    .select({ assignment: userPlanAssignments, plan: plans })
    .from(userPlanAssignments)
    .innerJoin(plans, eq(plans.id, userPlanAssignments.planId))
    .where(
      and(
        eq(userPlanAssignments.userId, userId),
        eq(userPlanAssignments.source, PlanAssignmentSource.SUBSCRIPTION),
        eq(userPlanAssignments.status, PlanAssignmentStatus.ACTIVE),
        gte(userPlanAssignments.endsAt, new Date()),
      ),
    )
    .orderBy(desc(userPlanAssignments.startsAt))
    .limit(1);
  return row ?? null;
}

/**
 * Buy a plan, or move up from the one you pay for. Plans rank by sortOrder
 * (Free < Lite monthly < Lite yearly < AI included monthly < AI included
 * yearly — admin-editable). A subscriber can only move up here, and
 * moving up changes their existing subscription instead of opening a second
 * one; moving down is done in the provider's billing portal.
 */
/**
 * What upgrading to `planKey` costs right now. A subscriber moves up in
 * place and the saved card is charged the prorated difference immediately,
 * so the client shows this and asks before calling createCheckout with
 * confirmUpgrade. Someone without a subscription goes through checkout
 * instead, where the provider shows the price itself.
 */
export async function previewUpgrade(userId: string, planKey: string) {
  const billing = requireProvider();
  const { plan, productId } = await buyablePlan(planKey);
  const current = await currentSubscription(userId);
  if (!current) return { mode: "checkout" as const, planName: plan.name };
  assertIsUpgrade(plan, current.plan);
  const subscriptionId = current.assignment.sourceRefId;
  if (!subscriptionId) throw new AppError("Couldn't find your subscription", 409, "NO_SUBSCRIPTION");
  const charge = await callProvider("plan change preview", () => billing.previewChangePlan(subscriptionId, productId));
  return {
    mode: "change" as const,
    planName: plan.name,
    fromPlanName: current.plan.name,
    billingInterval: plan.billingInterval,
    /** Charged to the saved card now: the prorated difference, tax included. */
    chargeNowMinor: charge.amountMinor,
    taxMinor: charge.taxMinor,
    currency: charge.currency.toLowerCase(),
    /** What each renewal costs after this. */
    renewalMinor: plan.priceMinor,
    renewalCurrency: plan.currency,
  };
}

async function buyablePlan(planKey: string) {
  const [plan] = await db.select().from(plans).where(eq(plans.key, planKey)).limit(1);
  const productId = env.DODO_PRODUCT_IDS[planKey];
  if (!plan || !plan.isActive || plan.priceMinor <= 0 || !productId) {
    throw new AppError("That plan isn't available to buy", 404, "PLAN_NOT_AVAILABLE");
  }
  return { plan, productId };
}

function assertIsUpgrade(target: { sortOrder: number }, current: { sortOrder: number }) {
  if (target.sortOrder <= current.sortOrder) {
    throw new AppError(
      "You're already on this plan or a bigger one. To move to a smaller plan, use Manage billing.",
      409,
      "NOT_AN_UPGRADE",
    );
  }
}

export async function createCheckout(userId: string, planKey: string, confirmUpgrade = false): Promise<{ url: string }> {
  const billing = requireProvider();

  const { plan, productId } = await buyablePlan(planKey);

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new AppError("User not found", 404, "NOT_FOUND");

  const base = `${env.FRONTEND_URL.replace(/\/$/, "")}/app/settings/billing`;

  const current = await currentSubscription(userId);
  if (current) {
    assertIsUpgrade(plan, current.plan);
    // Moving up charges the saved card on the spot, with no payment page —
    // never without the person having seen the amount and agreed.
    if (!confirmUpgrade) {
      throw new AppError("Confirm the upgrade charge first.", 409, "UPGRADE_NEEDS_CONFIRMATION");
    }
    const subscriptionId = current.assignment.sourceRefId;
    if (!subscriptionId) throw new AppError("Couldn't find your subscription", 409, "NO_SUBSCRIPTION");
    // The provider sends subscription.plan_changed, which moves the
    // assignment to the new plan (applySubscriptionEvent, same subscription).
    const { paymentUrl } = await callProvider("plan change", () => billing.changePlan(subscriptionId, productId));
    return { url: paymentUrl ?? `${base}?checkout=success` };
  }

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

  // Deliveries arrive late and out of order (a retried "active" can land after
  // a later "plan_changed"), so the event only says which subscription
  // changed: what's applied is how the provider has it right now. If that
  // read fails, the event itself is the best there is.
  const delivered = event;
  const latest = await billing.getSubscription(delivered.subscriptionId).catch((err) => {
    logger.warn({ err, subscriptionId: delivered.subscriptionId }, "[billing] couldn't re-read subscription; using the event");
    return undefined;
  });
  if (latest === null) return; // nothing to act on yet (e.g. pending)
  if (latest) event = { ...latest, eventId: delivered.eventId, type: delivered.type, userId: delivered.userId ?? latest.userId };

  const userId = await resolveUser(event);
  if (!userId) {
    logger.error({ subscriptionId: event.subscriptionId, customerId: event.customerId }, "[billing] no user for subscription");
    return;
  }
  await applyForUser(userId, event);
}

/**
 * Reads the user's live subscriptions from the provider and applies them —
 * what the billing page calls on the way back from checkout, so the new plan
 * shows even if the webhook is slow or lost. Safe to call any time: applying
 * the same subscription again only refreshes its assignment.
 */
export async function syncSubscriptions(userId: string): Promise<{ applied: number }> {
  const billing = requireProvider();
  const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new AppError("User not found", 404, "NOT_FOUND");
  const [customer] = await db.select().from(billingCustomers).where(eq(billingCustomers.userId, userId)).limit(1);

  const events = await billing.listLiveSubscriptions({ customerId: customer?.customerId ?? null, email: user.email });
  // Only subscriptions that are provably this user's: bought from this
  // account (our userId in the metadata), or under a customer already linked
  // to it. A bare email match isn't enough.
  const mine = events.filter((e) => e.userId === userId || (!e.userId && customer?.customerId === e.customerId));

  // Also re-read every subscription the user's plan already rests on, so a
  // stale assignment (a lost or out-of-order webhook) is corrected too —
  // including one that's been cancelled, which the live list leaves out.
  const linked = await db
    .select({ ref: userPlanAssignments.sourceRefId })
    .from(userPlanAssignments)
    .where(
      and(
        eq(userPlanAssignments.userId, userId),
        eq(userPlanAssignments.sourceRefType, SUBSCRIPTION_REF),
        eq(userPlanAssignments.status, PlanAssignmentStatus.ACTIVE),
      ),
    );
  const seen = new Set(mine.map((e) => e.subscriptionId));
  for (const { ref } of linked) {
    if (!ref || seen.has(ref)) continue;
    const current = await callProvider("subscription lookup", () => billing.getSubscription(ref));
    if (current) {
      mine.push(current);
      seen.add(ref);
    }
  }

  for (const event of mine) await applyForUser(userId, event);
  return { applied: mine.length };
}

async function applyForUser(userId: string, event: SubscriptionEvent): Promise<void> {
  const billing = requireProvider();

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
          // (e.g. one bought before a plan was retired).
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
        // assignment's endsAt (period end + grace), on the plan it's for.
        if (current) await tx.update(userPlanAssignments).set({ planId }).where(refMatch);
        return;
      case "cancelled": {
        if (!current) return;
        // Paid-for time is kept: access runs to the end of the period, on the
        // plan the subscription was on when it was cancelled.
        const endsAt = event.periodEnd && event.periodEnd > now ? event.periodEnd : now;
        await tx
          .update(userPlanAssignments)
          .set({ planId, endsAt, status: endsAt > now ? PlanAssignmentStatus.ACTIVE : PlanAssignmentStatus.CANCELLED })
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
