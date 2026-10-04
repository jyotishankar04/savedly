import { env } from "../../config/env";
import { UserStatus } from "../../db/enums";

/** Escapes text for safe HTML embedding — every template that interpolates
 * user-supplied strings (names, admin-composed body text) runs it through
 * this first. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** The one shared header/footer shell every email template renders inside —
 * plain inline-styled HTML (no external stylesheet — most mail clients
 * strip `<link>`/`<style>` blocks anyway). */
export function wrapBrandedEmail(bodyHtml: string, opts?: { title?: string }): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:24px 32px;border-bottom:1px solid #eee;">
                <span style="font-size:16px;font-weight:700;color:#111;">${escapeHtml(opts?.title ?? env.SMTP_FROM_NAME)}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;font-size:14px;line-height:1.6;color:#333;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid #eee;font-size:11px;color:#999;">
                You're receiving this because you have a ${escapeHtml(env.SMTP_FROM_NAME)} account.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Splits plain text on blank lines into `<p>` tags — the admin composer's
 * only authoring surface is a plain textarea, no rich-text editor. */
export function plainTextToHtmlParagraphs(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p style="margin:0 0 16px;">${escapeHtml(block).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

export interface EmailContent {
  subject: string;
  html: string;
}

export function welcomeEmailTemplate({ name }: { name: string | null }): EmailContent {
  const greeting = name ? `Hey ${escapeHtml(name)},` : "Hey there,";
  return {
    subject: `Welcome to ${env.SMTP_FROM_NAME}`,
    html: wrapBrandedEmail(`
      <p style="margin:0 0 16px;">${greeting}</p>
      <p style="margin:0 0 16px;">Welcome aboard — save anything you come across (links, notes, videos, images) and ${env.SMTP_FROM_NAME} organizes and helps you find it again later.</p>
      <p style="margin:0;"><a href="${env.FRONTEND_URL}/app" style="color:#4f46e5;font-weight:600;">Open your library &rarr;</a></p>
    `),
  };
}

const STATUS_COPY: Record<UserStatus, { subject: string; body: string }> = {
  [UserStatus.BANNED]: {
    subject: "Your account has been banned",
    body: "Your account has been banned for violating our terms of service. If you believe this is a mistake, reply to this email.",
  },
  [UserStatus.SUSPENDED]: {
    subject: "Your account has been suspended",
    body: "Your account has been temporarily suspended. Reply to this email if you have questions.",
  },
  [UserStatus.ACTIVE]: {
    subject: "Your account is active again",
    body: "Good news — your account has been reactivated. You can sign back in whenever you're ready.",
  },
  [UserStatus.INACTIVE]: {
    subject: "Your account status has changed",
    body: "Your account has been marked inactive.",
  },
  [UserStatus.DELETED]: {
    subject: "Your account has been deleted",
    body: "Your account and its data have been deleted.",
  },
};

export function userStatusChangedEmailTemplate({ name, status }: { name: string | null; status: UserStatus }): EmailContent {
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";
  const copy = STATUS_COPY[status];
  return {
    subject: copy.subject,
    html: wrapBrandedEmail(`
      <p style="margin:0 0 16px;">${greeting}</p>
      <p style="margin:0;">${copy.body}</p>
    `),
  };
}

export function shareInviteEmailTemplate({
  ownerName,
  resourceNoun,
  url,
}: {
  ownerName: string | null;
  resourceNoun: string;
  url: string;
}): EmailContent {
  const who = ownerName ?? "Someone";
  return {
    subject: `${who} shared a ${resourceNoun} with you`,
    html: wrapBrandedEmail(`
      <p style="margin:0 0 16px;">${escapeHtml(who)} shared a ${escapeHtml(resourceNoun)} with you on ${env.SMTP_FROM_NAME}.</p>
      <p style="margin:0;"><a href="${url}" style="color:#4f46e5;font-weight:600;">View it &rarr;</a></p>
    `),
  };
}

export function shareAccessRequestedEmailTemplate({
  requesterName,
  resourceNoun,
  url,
}: {
  requesterName: string | null;
  resourceNoun: string;
  url: string;
}): EmailContent {
  const who = requesterName ?? "Someone";
  return {
    subject: `${who} wants access to your ${resourceNoun}`,
    html: wrapBrandedEmail(`
      <p style="margin:0 0 16px;">${escapeHtml(who)} has requested access to a ${escapeHtml(resourceNoun)} you shared.</p>
      <p style="margin:0;"><a href="${url}" style="color:#4f46e5;font-weight:600;">Review the request &rarr;</a></p>
    `),
  };
}

export function shareAccessDecisionEmailTemplate({
  approved,
  resourceNoun,
  url,
}: {
  approved: boolean;
  resourceNoun: string;
  url: string | null;
}): EmailContent {
  return {
    subject: approved ? `You now have access to a shared ${resourceNoun}` : "Your access request was declined",
    html: wrapBrandedEmail(
      approved
        ? `<p style="margin:0 0 16px;">Your request to access a ${escapeHtml(resourceNoun)} was approved.</p><p style="margin:0;"><a href="${url}" style="color:#4f46e5;font-weight:600;">View it &rarr;</a></p>`
        : `<p style="margin:0;">Your request to access a ${escapeHtml(resourceNoun)} was declined.</p>`,
    ),
  };
}

export function adminComposedEmailTemplate({ subject, bodyText }: { subject: string; bodyText: string }): EmailContent {
  return { subject, html: wrapBrandedEmail(plainTextToHtmlParagraphs(bodyText)) };
}

export function eventDetectedEmailTemplate({
  title,
  eventAt,
  url,
}: {
  title: string;
  eventAt: string;
  url: string;
}): EmailContent {
  const formatted = new Date(eventAt).toLocaleString(undefined, {
    dateStyle: "full",
    timeStyle: "short",
  });
  return {
    subject: `We spotted an event in "${title}"`,
    html: wrapBrandedEmail(`
      <p style="margin:0 0 16px;">Looks like <strong>${escapeHtml(title)}</strong> is about something happening on <strong>${escapeHtml(formatted)}</strong>.</p>
      <p style="margin:0 0 16px;">Want to add it to your calendar?</p>
      <p style="margin:0;"><a href="${url}" style="color:#4f46e5;font-weight:600;">Review and add to calendar &rarr;</a></p>
    `),
  };
}
