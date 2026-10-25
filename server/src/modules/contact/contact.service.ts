import { eq } from "drizzle-orm";
import { db } from "../../db";
import { contactMessages } from "../../db/schema";
import { getSection } from "../../platform/instance-settings/instance-settings.service";
import { isEmailEnabled, sendMail } from "../../platform/mailer/mailer";
import { logger } from "../../shared/utils/logger";
import type { SendContactInput } from "./contact.schema";

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * A message from the website's contact page. Saved first, so it's never lost
 * and can be read and answered in Admin > Messages; then a copy goes to the
 * contact address (Admin > Infrastructure > Email) with Reply-To set to the
 * person who wrote, so answering is just pressing Reply. The email is best
 * effort: switched off or failing, the message is still saved and the person
 * still sees it arrive.
 */
export async function sendContactMessage(input: SendContactInput, userId: string | null): Promise<{ id: string }> {
  const [row] = await db
    .insert(contactMessages)
    .values({ name: input.name, email: input.email, topic: input.topic, message: input.message, userId })
    .returning({ id: contactMessages.id });
  void emailTeam(row.id, input);
  return { id: row.id };
}

async function emailTeam(id: string, input: SendContactInput): Promise<void> {
  try {
    const settings = (await getSection("email")) as { contactAddress?: string };
    if (!(await isEmailEnabled()) || !settings.contactAddress) return;
    const lines = escape(input.message).replace(/\r?\n/g, "<br>");
    await sendMail({
      to: settings.contactAddress,
      replyTo: `"${input.name.replace(/["\r\n]/g, "")}" <${input.email}>`,
      subject: `[Contact] ${input.topic}: ${input.name.replace(/[\r\n]/g, " ")}`,
      html: `<p><strong>${escape(input.name)}</strong> &lt;${escape(input.email)}&gt; wrote about <strong>${escape(input.topic)}</strong>:</p><p>${lines}</p><p style="color:#666">Also in Admin &gt; Messages. Message ${id}.</p>`,
    });
    await db.update(contactMessages).set({ emailedAt: new Date() }).where(eq(contactMessages.id, id));
  } catch (err) {
    logger.error({ contactMessageId: id, err }, "[contact] email to the team failed");
  }
}
