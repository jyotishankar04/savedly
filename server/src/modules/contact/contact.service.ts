import { getSection } from "../instance-settings/instance-settings.service";
import { isEmailEnabled, sendMail } from "../../shared/mailer/mailer";
import { AppError } from "../../shared/errors/app-error";
import type { SendContactInput } from "./contact.schema";

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Emails a message from the website's contact page to the contact address
 * (Admin > Infrastructure > Email), with Reply-To set to the person who
 * wrote, so answering is just pressing Reply. Sent straight away rather than
 * queued: the page tells them it arrived, so it has to have.
 */
export async function sendContactMessage(input: SendContactInput): Promise<void> {
  const settings = (await getSection("email")) as { contactAddress?: string };
  if (!(await isEmailEnabled()) || !settings.contactAddress) {
    throw new AppError("The contact form isn't working on this server. Please email us instead.", 503);
  }

  const lines = escape(input.message).replace(/\r?\n/g, "<br>");
  try {
    await sendMail({
      to: settings.contactAddress,
      replyTo: `"${input.name.replace(/["\r\n]/g, "")}" <${input.email}>`,
      subject: `[Contact] ${input.topic}: ${input.name.replace(/[\r\n]/g, " ")}`,
      html: `<p><strong>${escape(input.name)}</strong> &lt;${escape(input.email)}&gt; wrote about <strong>${escape(input.topic)}</strong>:</p><p>${lines}</p>`,
    });
  } catch {
    throw new AppError("We couldn't send that just now. Please try again, or email us instead.", 502);
  }
}
