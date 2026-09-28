// What the billing service needs from a payment provider. Dodo Payments is
// the one adapter today (dodo.provider.ts); another merchant of record
// (Polar, Paddle) or Razorpay slots in behind the same interface.

export type SubscriptionEventKind =
  | "active" // started, renewed, resumed, plan changed — access runs to periodEnd
  | "past_due" // renewal failed, provider grace period — keep access
  | "cancelled" // won't renew — keep access until periodEnd
  | "ended"; // on hold, failed, expired — access stops now

export interface SubscriptionEvent {
  /** Provider's unique delivery id, for idempotency. */
  eventId: string;
  type: string;
  kind: SubscriptionEventKind;
  subscriptionId: string;
  customerId: string;
  customerEmail: string | null;
  productId: string;
  /** Our user id, when we put it in the checkout's metadata. */
  userId: string | null;
  /** When the paid period ends (next billing date / expiry). */
  periodEnd: Date | null;
}

export interface BillingProvider {
  name: string;
  createCheckout(input: {
    productId: string;
    user: { id: string; email: string; name: string | null };
    customerId: string | null;
    returnUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }>;
  customerPortalUrl(customerId: string): Promise<string>;
  /** Verifies the signature and returns the event, or null for event types billing ignores. Throws on a bad signature. */
  parseWebhook(rawBody: string, headers: Record<string, string>): SubscriptionEvent | null;
}
