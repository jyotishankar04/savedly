import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "../../db";
import { plans, userPlanAssignments, users } from "../../db/schema";
import { PlanAssignmentSource, PlanAssignmentStatus } from "../../db/enums";
import { env } from "../../config/env";
import { AppError } from "../../shared/errors/app-error";
import { callProvider, customerIdFor, getProvider, requireProvider } from "./billing.gateway";
import { applyForUser } from "./billing.webhooks";

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
 * Buy a plan or move up. Plans rank by sortOrder; a subscriber can only move up (changing their
 * subscription); moving down is in the provider's portal.
 */
/**
 * The paid subscription a plan rests on, with live provider state. Only active or past-due ones
 * change in place; a cancelled one gives access until period end, so moving up needs a new
 * checkout.
 */
async function paidSubscription(userId: string) {
  const current = await currentSubscription(userId);
  const ref = current?.assignment.sourceRefId;
  if (!current || !ref) return null;
  const live = await callProvider("subscription lookup", () => requireProvider().getSubscription(ref));
  const status = live?.kind ?? "ended";
  return {
    ...current,
    subscriptionId: ref,
    status,
    cancelAtPeriodEnd: !!live?.cancelAtPeriodEnd,
    changeable: status === "active" || status === "past_due",
  };
}

/** What Settings -> Plan & usage needs to offer the right way up. */
export async function billingStatus(userId: string) {
  const sub = await paidSubscription(userId);
  if (!sub) return { subscription: null };
  return {
    subscription: {
      planKey: sub.plan.key,
      planName: sub.plan.name,
      sortOrder: sub.plan.sortOrder,
      status: sub.status,
      /** Renews on, or (cancelled) access ends on. */
      periodEnd: sub.assignment.endsAt,
      /** True when moving up changes this subscription in place (and charges the saved card). */
      changeable: sub.changeable,
      /** Still active, but set not to renew. */
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    },
  };
}

/**
 * A cancelled subscription can't move up in place; buying at or below it would only cut its paid
 * time short.
 */
function assertAboveCancelled(target: { sortOrder: number }, sub: { plan: { name: string; sortOrder: number }; assignment: { endsAt: Date | null } }) {
  if (target.sortOrder <= sub.plan.sortOrder) {
    const until = sub.assignment.endsAt
      ? ` until ${sub.assignment.endsAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
      : "";
    throw new AppError(`You already have ${sub.plan.name}${until}. It's cancelled, so it won't renew.`, 409, "NOT_AN_UPGRADE");
  }
}

/**
 * What upgrading costs now. A subscriber moves up in place and the saved card is charged the
 * prorated difference, so the client shows this and asks first (createCheckout with
 * confirmUpgrade). Others go through checkout.
 */
export async function previewUpgrade(userId: string, planKey: string) {
  const billing = requireProvider();
  const { plan, productId } = await buyablePlan(planKey);
  const current = await paidSubscription(userId);
  if (!current) return { mode: "checkout" as const, planName: plan.name };
  if (!current.changeable) {
    assertAboveCancelled(plan, current);
    return { mode: "checkout" as const, planName: plan.name };
  }
  assertIsUpgrade(plan, current.plan);
  const { subscriptionId } = current;
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

  const current = await paidSubscription(userId);
  if (current && !current.changeable) assertAboveCancelled(plan, current);
  if (current?.changeable) {
    assertIsUpgrade(plan, current.plan);
    // Moving up charges the saved card at once with no payment page, so never without the person
    // seeing the amount and agreeing.
    if (!confirmUpgrade) {
      throw new AppError("Confirm the upgrade charge first.", 409, "UPGRADE_NEEDS_CONFIRMATION");
    }
    const { subscriptionId } = current;
    // The provider's subscription.plan_changed moves the assignment to the new plan (applySubscriptionEvent).
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

/**
 * Admin plan change on the real subscription so billing and the app agree. Paid plans switch with
 * nothing charged now (new price at next renewal); Free cancels at period end; admin grants end.
 * Null when it can't be changed (the caller grants).
 */
export async function adminChangeSubscription(userId: string, planKey: string) {
  if (!getProvider()) return null;
  const sub = await paidSubscription(userId);
  if (!sub?.changeable) return null;
  const billing = requireProvider();

  const [target] = await db.select().from(plans).where(eq(plans.key, planKey)).limit(1);
  if (!target) throw new AppError("Plan not found", 404, "NOT_FOUND");

  let outcome: { action: "switched" | "cancelling"; planName: string };
  if (target.priceMinor <= 0) {
    await callProvider("cancel at period end", () => billing.cancelAtPeriodEnd(sub.subscriptionId));
    outcome = { action: "cancelling", planName: sub.plan.name };
  } else {
    // Keep their billing interval: yearly payers move to the yearly version.
    const tier = target.key.replace(/-(monthly|yearly|semi-annual|annual)$/, "");
    const [sameInterval] = await db
      .select()
      .from(plans)
      .where(and(eq(plans.isActive, true), eq(plans.billingInterval, sub.plan.billingInterval), sql`${plans.key} like ${`${tier}-%`}`))
      .limit(1);
    const plan = sameInterval ?? target;
    const productId = env.DODO_PRODUCT_IDS[plan.key];
    if (!productId) throw new AppError(`${plan.name} can't be sold yet (no product for it)`, 409, "PLAN_NOT_AVAILABLE");
    if (plan.key !== sub.plan.key) {
      await callProvider("admin plan change", () => billing.changePlan(sub.subscriptionId, productId, "next_renewal"));
    }
    outcome = { action: "switched", planName: plan.name };
  }

  // The app follows the provider now, not when the webhook lands.
  const latest = await callProvider("subscription lookup", () => billing.getSubscription(sub.subscriptionId));
  if (latest) await applyForUser(userId, latest);
  await db
    .update(userPlanAssignments)
    .set({ status: PlanAssignmentStatus.CANCELLED, endsAt: new Date() })
    .where(
      and(
        eq(userPlanAssignments.userId, userId),
        eq(userPlanAssignments.source, PlanAssignmentSource.ADMIN_MANUAL),
        eq(userPlanAssignments.status, PlanAssignmentStatus.ACTIVE),
      ),
    );
  return outcome;
}

export async function createPortalLink(userId: string): Promise<{ url: string }> {
  const billing = requireProvider();
  const customerId = await customerIdFor(userId);
  if (!customerId) throw new AppError("You don't have a subscription to manage yet", 404, "NO_SUBSCRIPTION");
  return { url: await callProvider("portal", () => billing.customerPortalUrl(customerId)) };
}
