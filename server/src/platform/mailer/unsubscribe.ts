import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../config/env";

// Unsubscribe links are opened from an inbox, signed out, possibly years
// later. So the link carries the user's id and a signature of it, with no
// expiry and no session. The signing key is derived from JWT_ACCESS_SECRET
// under its own label, so a token is useless as anything else.

/** Stands in for the recipient's link in a rendered email until it is known. */
export const UNSUBSCRIBE_URL_PLACEHOLDER = "{{unsubscribe_url}}";

function sign(userId: string): string {
  return createHmac("sha256", env.JWT_ACCESS_SECRET).update(`email-unsubscribe:${userId}`).digest("base64url");
}

export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  const expected = Buffer.from(sign(userId));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

function query(userId: string): string {
  return `u=${encodeURIComponent(userId)}&t=${sign(userId)}`;
}

/** The page the link in the email opens: it asks before changing anything. */
export function unsubscribePageUrl(userId: string): string {
  return `${env.FRONTEND_URL}/unsubscribe?${query(userId)}`;
}

/**
 * The List-Unsubscribe headers (RFC 8058). They put an "Unsubscribe" button
 * in Gmail and other inboxes, which POSTs to the API with no page shown.
 */
export function unsubscribeHeaders(userId: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${env.SERVER_URL}/api/v1/email/unsubscribe?${query(userId)}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
