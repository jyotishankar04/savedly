import nodemailer, { type Transporter } from "nodemailer";
import { getSection, settingsVersion } from "../instance-settings/instance-settings.service";
import { htmlToText } from "./html-to-text";

export interface SmtpSettings {
  enabled: boolean;
  host?: string;
  port?: number;
  secure?: boolean;
  username?: string;
  password?: string;
  fromAddress?: string;
  fromName?: string;
}

export function createTransport(settings: SmtpSettings): Transporter {
  return nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: !!settings.secure,
    auth: settings.username ? { user: settings.username, pass: settings.password } : undefined,
  });
}

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  /** Extra message headers, such as List-Unsubscribe. */
  headers?: Record<string, string>;
  /** Where a reply goes, when not to the sender (the contact form: the person who wrote in). */
  replyTo?: string;
}

/**
 * The only place nodemailer is imported outside this file. The transport is rebuilt when an admin
 * saves new email settings.
 */
export class Mailer {
  private active: { version: number; settings: SmtpSettings; transporter: Transporter | null } | null = null;

  private async current() {
    if (this.active && this.active.version === settingsVersion()) return this.active;
    const settings = (await getSection("email")) as unknown as SmtpSettings;
    this.active = { version: settingsVersion(), settings, transporter: settings.enabled ? createTransport(settings) : null };
    return this.active;
  }

  /** False on a self-hosted install until an admin sets up SMTP — every email then quietly skips. */
  async isEnabled(): Promise<boolean> {
    return (await this.current()).settings.enabled;
  }

  /**
   * Throws on failure on purpose: it runs in the email worker, which owns retries and status
   * through BullMQ attempts. Fire-and-forget handling belongs at the enqueue site
   * (email.service.ts).
   */
  async send(input: SendMailInput): Promise<void> {
    const { settings, transporter } = await this.current();
    if (!transporter) throw new Error("Email isn't configured on this server");
    await transporter.sendMail({
      from: `"${settings.fromName}" <${settings.fromAddress}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      // Sent as multipart/alternative: see html-to-text.ts for why.
      text: htmlToText(input.html),
      headers: input.headers,
      replyTo: input.replyTo,
    });
  }
}

const mailer = new Mailer();

export const isEmailEnabled = () => mailer.isEnabled();
export const sendMail = (input: SendMailInput) => mailer.send(input);
