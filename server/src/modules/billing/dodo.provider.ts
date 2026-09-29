import DodoPayments from "dodopayments";
import { env } from "../../config/env";
import type { BillingProvider, SubscriptionEvent, SubscriptionEventKind } from "./billing.provider";

const KIND_BY_TYPE: Record<string, SubscriptionEventKind> = {
  "subscription.active": "active",
  "subscription.renewed": "active",
  "subscription.unpaused": "active",
  "subscription.plan_changed": "active",
  "subscription.past_due": "past_due",
  "subscription.cancelled": "cancelled",
  "subscription.on_hold": "ended",
  "subscription.paused": "ended",
  "subscription.failed": "ended",
  "subscription.expired": "ended",
};

// A subscription's current status, read from the API rather than an event.
const KIND_BY_STATUS: Record<string, SubscriptionEventKind | undefined> = {
  active: "active",
  past_due: "past_due",
  cancelled: "cancelled",
  on_hold: "ended",
  paused: "ended",
  failed: "ended",
  expired: "ended",
};

interface DodoSubscriptionData {
  subscription_id: string;
  product_id: string;
  customer: { customer_id: string; email?: string | null };
  metadata?: Record<string, string> | null;
  next_billing_date?: string | null;
  expires_at?: string | null;
}

export function createDodoProvider(): BillingProvider {
  const client = new DodoPayments({
    bearerToken: env.DODO_PAYMENTS_API_KEY,
    webhookKey: env.DODO_PAYMENTS_WEBHOOK_KEY ?? null,
    environment: env.DODO_PAYMENTS_ENVIRONMENT,
  });

  return {
    name: "dodo",

    async createCheckout({ productId, user, customerId, returnUrl, cancelUrl }) {
      const session = await client.checkoutSessions.create({
        product_cart: [{ product_id: productId, quantity: 1 }],
        // Reuse the Dodo customer when we already have one, so a returning
        // subscriber keeps one billing history and one portal.
        customer: customerId ? { customer_id: customerId } : { email: user.email, name: user.name ?? undefined },
        metadata: { userId: user.id },
        return_url: returnUrl,
        cancel_url: cancelUrl,
      });
      if (!session.checkout_url) throw new Error("Dodo returned no checkout URL");
      return { url: session.checkout_url };
    },

    async changePlan(subscriptionId, productId) {
      const result = await client.subscriptions.changePlan(subscriptionId, {
        product_id: productId,
        quantity: 1,
        // Charge the difference for the rest of the current period now; the
        // next renewal bills the new plan's full price.
        proration_billing_mode: "prorated_immediately",
      });
      return { paymentUrl: result.payment_link ?? null };
    },

    async previewChangePlan(subscriptionId, productId) {
      const preview = await client.subscriptions.previewChangePlan(subscriptionId, {
        product_id: productId,
        quantity: 1,
        proration_billing_mode: "prorated_immediately",
      });
      const { summary } = preview.immediate_charge;
      return { amountMinor: summary.total_amount, taxMinor: summary.tax ?? null, currency: summary.currency };
    },

    async customerPortalUrl(customerId) {
      const portal = await client.customers.customerPortal.create(customerId);
      return portal.link;
    },

    async listLiveSubscriptions({ customerId, email }) {
      const customerIds = customerId
        ? [customerId]
        : (await client.customers.list({ email, page_size: 10 })).items.map((c) => c.customer_id);
      const events: SubscriptionEvent[] = [];
      for (const id of customerIds) {
        for (const status of ["active", "past_due"] as const) {
          const page = await client.subscriptions.list({ customer_id: id, status, page_size: 20 });
          for (const sub of page.items) {
            const event = fromSubscription(sub as unknown as DodoSubscriptionData & { status: string });
            if (event) events.push(event);
          }
        }
      }
      return events;
    },

    async getSubscription(subscriptionId) {
      const sub = await client.subscriptions.retrieve(subscriptionId);
      return fromSubscription(sub as unknown as DodoSubscriptionData & { status: string });
    },

    parseWebhook(rawBody, headers) {
      // Verifies the Standard Webhooks signature (webhook-id / -timestamp /
      // -signature) against DODO_PAYMENTS_WEBHOOK_KEY; throws if it's wrong.
      const event = client.webhooks.unwrap(rawBody, { headers });
      const kind = KIND_BY_TYPE[event.type];
      if (!kind) return null;

      const data = event.data as unknown as DodoSubscriptionData;
      const periodEnd = data.next_billing_date ?? data.expires_at ?? null;
      return {
        eventId: headers["webhook-id"] ?? `${event.type}:${data.subscription_id}:${event.timestamp}`,
        type: event.type,
        kind,
        subscriptionId: data.subscription_id,
        customerId: data.customer.customer_id,
        customerEmail: data.customer.email ?? null,
        productId: data.product_id,
        userId: data.metadata?.userId ?? null,
        periodEnd: periodEnd ? new Date(periodEnd) : null,
      };
    },
  };
}

/** A subscription's current state as an event (sync, and re-reads after a webhook). */
function fromSubscription(sub: DodoSubscriptionData & { status: string }): SubscriptionEvent | null {
  const kind = KIND_BY_STATUS[sub.status];
  if (!kind) return null; // pending: not paid for yet
  const periodEnd = sub.next_billing_date ?? sub.expires_at ?? null;
  return {
    eventId: `state:${sub.subscription_id}:${sub.status}:${periodEnd}`,
    type: `state.${sub.status}`,
    kind,
    subscriptionId: sub.subscription_id,
    customerId: sub.customer.customer_id,
    customerEmail: sub.customer.email ?? null,
    productId: sub.product_id,
    userId: sub.metadata?.userId ?? null,
    periodEnd: periodEnd ? new Date(periodEnd) : null,
  };
}
