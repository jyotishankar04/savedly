import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "../../db";
import { billingCustomers, billingEvents, plans, userPlanAssignments, users } from "../../db/schema";
import { PlanAssignmentSource, PlanAssignmentStatus } from "../../db/enums";
import { env } from "../../config/env";
import { AppError } from "../../shared/errors/app-error";
import { logger } from "../../shared/utils/logger";
import type { SubscriptionEvent } from "./billing.provider";
import { bumpUserCache } from "../../shared/cache/response-cache";
import { SUBSCRIPTION_REF, callProvider, requireProvider } from "./billing.gateway";

// Access runs a bit past the billing date so a late renewal never flickers someone to Free.
const RENEWAL_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

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

/** Verifies and applies one provider webhook, idempotent on the delivery id. */
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

  // Deliveries are late and out of order, so the event only names the subscription; apply the
  // provider's current state (the event itself if that read fails).
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
 * Reads live subscriptions from the provider and applies them; the billing page calls it after
 * checkout so the plan shows even if the webhook is slow. Safe to repeat.
 */
export async function syncSubscriptions(userId: string): Promise<{ applied: number }> {
  const billing = requireProvider();
  const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new AppError("User not found", 404, "NOT_FOUND");
  const [customer] = await db.select().from(billingCustomers).where(eq(billingCustomers.userId, userId)).limit(1);

  const events = await billing.listLiveSubscriptions({ customerId: customer?.customerId ?? null, email: user.email });
  // Only provably this user's subscriptions: our userId in the metadata, or under an already linked
  // customer. An email match isn't enough.
  const mine = events.filter((e) => e.userId === userId || (!e.userId && customer?.customerId === e.customerId));

  // Also re-read subscriptions the plan already rests on, correcting a stale assignment (lost or
  // out-of-order webhook), including cancelled ones the live list omits.
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

export async function applyForUser(userId: string, event: SubscriptionEvent): Promise<void> {
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
    // Providers send several events per subscription at once (Dodo sends .active and .renewed
    // together); per-subscription serialization stops two handlers each inserting an assignment.
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
          // A new subscription replaces any other subscription-bought plan (e.g. one from a retired plan).
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
        // The provider is retrying the charge: access continues until endsAt (period end + grace)
        // on that plan.
        if (current) await tx.update(userPlanAssignments).set({ planId }).where(refMatch);
        return;
      case "cancelled": {
        if (!current) return;
        // Paid-for time is kept: access runs to period end on the plan it was cancelled on.
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
  // The plan changed outside the user's own request: drop their cached reads.
  await bumpUserCache(userId);
}
