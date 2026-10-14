import { apiFetch } from "@/lib/auth";

/** The one address people write to: questions, billing, privacy, security. Shown on the site and in the docs. */
export const SUPPORT_EMAIL = "support@savedly.app";
export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;

/** The topics the contact form offers; the server accepts exactly these (server/src/modules/contact). */
export const CONTACT_TOPICS = ["Question", "Account", "Bug", "Idea", "Other"];

/** Emails a message from the contact page to the support inbox. Rejects with the server's own explanation. */
export async function sendContactMessage(message: { name: string; email: string; topic: string; message: string }): Promise<void> {
  await apiFetch<{ sent: true }>("/contact", { method: "POST", body: message });
}
