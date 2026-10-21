import { ApiError, apiFetch } from "@/lib/auth";

/** The one address people write to: questions, billing, privacy, security. Shown on the site and in the docs. */
export const SUPPORT_EMAIL = "support@savedly.app";
export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;

/** The topics the contact form offers; the server accepts exactly these (server/src/modules/contact). */
export const CONTACT_TOPICS = ["Question", "Account", "Bug", "Idea", "Other"];

/** Said when someone has sent several messages or reports within the hour (the server allows a few an hour). */
export const TOO_MANY_MESSAGES = `You've sent a few messages in the last hour, so this one wasn't sent. Try again in a little while, or email ${SUPPORT_EMAIL}.`;

/** Sends a message from the contact page to the team (Admin > Messages). Rejects with the server's own explanation. */
export async function sendContactMessage(message: { name: string; email: string; topic: string; message: string }): Promise<void> {
  try {
    await apiFetch<{ sent: true }>("/contact", { method: "POST", body: message });
  } catch (err) {
    if (err instanceof ApiError && err.status === 429) throw new ApiError(TOO_MANY_MESSAGES, 429, err.code);
    throw err;
  }
}
