import nodemailer, { type Transporter } from "nodemailer";
import { getSection, settingsVersion } from "../../modules/instance-settings/instance-settings.service";
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

let active: { version: number; settings: SmtpSettings; transporter: Transporter | null } | null = null;

async function current() {
  if (active && active.version === settingsVersion()) return active;
  const settings = (await getSection("email")) as unknown as SmtpSettings;
  active = { version: settingsVersion(), settings, transporter: settings.enabled ? createTransport(settings) : null };
  return active;
}

/** False on a self-hosted install until an admin sets up SMTP — every email then quietly skips. */
export async function isEmailEnabled(): Promise<boolean> {
  return (await current()).settings.enabled;
}

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  /** Extra message headers, such as List-Unsubscribe. */
  headers?: Record<string, string>;
}

/**
 * The only place nodemailer is imported outside this file. Deliberately
 * throws on failure rather than swallowing it — this runs inside the email
 * worker, which owns retry/status bookkeeping via BullMQ's own attempts
 * mechanism. Fire-and-forget error handling belongs at the enqueue site
 * (email.service.ts), not here.
 */
export async function sendMail(input: SendMailInput): Promise<void> {
  const { settings, transporter } = await current();
  if (!transporter) throw new Error("Email isn't configured on this server");
  await transporter.sendMail({
    from: `"${settings.fromName}" <${settings.fromAddress}>`,
    to: input.to,
    subject: input.subject,
    html: input.html,
    // Sent as multipart/alternative: see html-to-text.ts for why.
    text: htmlToText(input.html),
    headers: input.headers,
  });
}
