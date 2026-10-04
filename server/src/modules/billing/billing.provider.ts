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
  /** Set to cancel at the end of the paid period (still active until then). */
  cancelAtPeriodEnd?: boolean;
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
  /**
   * Moves an existing subscription to another product, billing the prorated
   * difference now. Returns a payment page when the provider needs the
   * customer to confirm the charge, else null (the saved method was charged).
   */
  changePlan(
    subscriptionId: string,
    productId: string,
    /** "prorated": bill the difference now (a customer moving up). "next_renewal": no charge now; the new price applies from the next renewal. */
    billing?: "prorated" | "next_renewal",
  ): Promise<{ paymentUrl: string | null }>;
  /** Stops the subscription renewing; it stays active until the paid period ends. */
  cancelAtPeriodEnd(subscriptionId: string): Promise<void>;
  /** What changePlan would charge right now (prorated, tax included), without changing anything. */
  previewChangePlan(subscriptionId: string, productId: string): Promise<{ amountMinor: number; taxMinor: number | null; currency: string }>;
  /** Verifies the signature and returns the event, or null for event types billing ignores. Throws on a bad signature. */
  parseWebhook(rawBody: string, headers: Record<string, string>): SubscriptionEvent | null;
  /**
   * The customer's live subscriptions, read straight from the provider, as
   * "active" events — so a purchase shows up even when its webhook is late
   * or never arrives. Looks the customer up by email when there's no id yet.
   */
  listLiveSubscriptions(input: { customerId: string | null; email: string }): Promise<SubscriptionEvent[]>;
  /** One subscription as it is right now, or null when there's nothing to act on (e.g. still pending). */
  getSubscription(subscriptionId: string): Promise<SubscriptionEvent | null>;
}
