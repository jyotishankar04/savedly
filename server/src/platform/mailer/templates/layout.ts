import { env } from "../../../config/env";
import { UNSUBSCRIBE_URL_PLACEHOLDER } from "../unsubscribe";

// -----------------------------------------------------------------------------
// The email design system.
//
// Every email is built from the pieces in this file, so they all share one
// look, the app's and kept minimal: one column of text on white with plenty
// of room, the brand blue for the one thing to click, hairlines rather than
// boxes, while each kind of email has its own layout.
//
// Mail clients are not browsers. Outlook renders with Word's engine and many
// clients strip <style> blocks, so everything here is tables and inline
// styles, colours are plain hex, and nothing depends on web fonts, flexbox or
// images loading (the header reads fine as text when images are blocked).
// -----------------------------------------------------------------------------

export const COLOR = {
  page: "#ffffff",
  card: "#ffffff",
  border: "#e8ebf1",
  text: "#0f172a",
  body: "#475569",
  muted: "#8a94a6",
  primary: "#1746d6",
  primarySoft: "#e8eeff",
  success: "#0f7a4d",
  successSoft: "#e3f6ec",
  warning: "#9a5b00",
  warningSoft: "#fff3d6",
  danger: "#b42318",
  dangerSoft: "#fde8e6",
  neutralSoft: "#eef1f6",
} as const;

const FONT = "Geist,Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export type Tone = "primary" | "success" | "warning" | "danger" | "neutral";

const TONE: Record<Tone, { fg: string; bg: string }> = {
  primary: { fg: COLOR.primary, bg: COLOR.primarySoft },
  success: { fg: COLOR.success, bg: COLOR.successSoft },
  warning: { fg: COLOR.warning, bg: COLOR.warningSoft },
  danger: { fg: COLOR.danger, bg: COLOR.dangerSoft },
  neutral: { fg: COLOR.body, bg: COLOR.neutralSoft },
};

/** Escapes text for safe HTML embedding — every template that interpolates
 * user-supplied strings (names, titles, admin-composed body text) runs it
 * through this first. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// --- Components --------------------------------------------------------------

/** The small label above a headline: what kind of email this is. Plain coloured text, no box. */
export function eyebrow(text: string, tone: Tone = "primary"): string {
  return `<p style="margin:0;color:${TONE[tone].fg};font-size:13px;line-height:1.4;font-weight:600;">${escapeHtml(text)}</p>`;
}

export function heading(html: string): string {
  return `<h1 style="margin:10px 0 0;font-size:26px;line-height:1.2;font-weight:600;letter-spacing:-.025em;color:${COLOR.text};">${html}</h1>`;
}

export function paragraph(html: string, opts?: { muted?: boolean; top?: number }): string {
  return `<p style="margin:${opts?.top ?? 14}px 0 0;font-size:15px;line-height:1.65;color:${opts?.muted ? COLOR.muted : COLOR.body};">${html}</p>`;
}

/** The one action an email asks for. A table cell, not a styled link, so the
 * whole pill is coloured and clickable in Outlook too. */
export function button(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0;">
    <tr>
      <td bgcolor="${COLOR.primary}" style="border-radius:999px;background:${COLOR.primary};">
        <a href="${url}" style="display:inline-block;padding:12px 22px;font-family:${FONT};font-size:14px;line-height:1;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

/** Sets something apart (the shared item, the event, a notice) with a thin line
 * down its left side in the tone's colour, rather than a filled box. */
export function panel(html: string, tone: Tone = "neutral"): string {
  const line = tone === "neutral" ? COLOR.border : TONE[tone].fg;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 0;">
    <tr>
      <td style="padding:2px 0 2px 16px;border-left:2px solid ${line};">${html}</td>
    </tr>
  </table>`;
}

/** A round tile holding one or two characters: a person's initial, a tick. */
export function badge(content: string, tone: Tone): string {
  const { fg, bg } = TONE[tone];
  return `<table role="presentation" cellpadding="0" cellspacing="0">
    <tr>
      <td width="48" height="48" align="center" valign="middle" style="width:48px;height:48px;border-radius:999px;background:${bg};color:${fg};font-size:20px;line-height:48px;font-weight:700;">${content}</td>
    </tr>
  </table>`;
}

export function initialOf(name: string | null): string {
  const first = (name ?? "").trim().charAt(0);
  return first ? escapeHtml(first.toUpperCase()) : "?";
}

/** A numbered list of next steps: a quiet 01, 02… beside each, no circles. */
export function steps(items: { title: string; text: string }[]): string {
  const rows = items
    .map(
      (item, i) => `<tr>
        <td width="32" valign="top" style="padding:${i === 0 ? 0 : 18}px 0 0;font-size:13px;line-height:1.55;font-weight:500;color:${COLOR.muted};font-variant-numeric:tabular-nums;">${String(i + 1).padStart(2, "0")}</td>
        <td valign="top" style="padding:${i === 0 ? 0 : 18}px 0 0;">
          <p style="margin:0;font-size:15px;line-height:1.45;font-weight:600;color:${COLOR.text};">${escapeHtml(item.title)}</p>
          <p style="margin:3px 0 0;font-size:14px;line-height:1.55;color:${COLOR.body};">${escapeHtml(item.text)}</p>
        </td>
      </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 0;">${rows}</table>`;
}

/** A short list of points, each with a small blue dot. */
export function bullets(items: string[]): string {
  const rows = items
    .map(
      (item, i) => `<tr>
        <td width="18" valign="top" style="padding:${i === 0 ? 0 : 8}px 0 0;font-size:15px;line-height:1.55;color:${COLOR.primary};">&#8226;</td>
        <td valign="top" style="padding:${i === 0 ? 0 : 8}px 0 0;font-size:15px;line-height:1.55;color:${COLOR.body};">${escapeHtml(item)}</td>
      </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 0;">${rows}</table>`;
}

export function image(url: string, alt: string): string {
  return `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" width="456" style="display:block;width:100%;max-width:456px;height:auto;margin:20px 0 0;border:0;border-radius:14px;" />`;
}

export function divider(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;"><tr><td style="border-top:1px solid ${COLOR.border};font-size:0;line-height:0;">&nbsp;</td></tr></table>`;
}

/** The calendar tile the app shows for an event: month over day. */
export function dateTile(date: Date): string {
  const month = date.toLocaleString("en-US", { month: "short" }).toUpperCase();
  return `<table role="presentation" cellpadding="0" cellspacing="0">
    <tr>
      <td width="56" align="center" style="width:56px;padding:9px 0 8px;border-radius:14px;background:${COLOR.card};border:1px solid ${COLOR.border};">
        <div style="font-size:10px;line-height:1;font-weight:700;letter-spacing:.08em;color:${COLOR.primary};">${month}</div>
        <div style="margin-top:4px;font-size:22px;line-height:1;font-weight:700;color:${COLOR.text};">${date.getDate()}</div>
      </td>
    </tr>
  </table>`;
}

// --- Layout ------------------------------------------------------------------

/** Why this person got the email. Everyone with an account gets the first;
 * a share invitation can reach someone who has never heard of the product. */
type FooterReason =
  | { kind: "account" }
  | { kind: "shared"; by: string }
  | { kind: "custom"; text: string }
  /** Sent to many people at once: says so, and carries the way out. */
  | { kind: "announcement" }
  /** A regular email someone can turn off in Settings: says why it came, and links there. */
  | { kind: "setting"; what: string; settingsUrl: string };

function footerText(reason: FooterReason): string {
  const product = escapeHtml(env.SMTP_FROM_NAME);
  if (reason.kind === "account") return `You're receiving this because you have a ${product} account.`;
  if (reason.kind === "announcement") {
    return `You're receiving this because you have a ${product} account and get its announcements. <a href="${UNSUBSCRIBE_URL_PLACEHOLDER}" style="color:${COLOR.muted};text-decoration:underline;">Unsubscribe</a>`;
  }
  if (reason.kind === "setting") {
    return `You're receiving this because ${escapeHtml(reason.what)} is on in your ${product} settings. <a href="${escapeHtml(reason.settingsUrl)}" style="color:${COLOR.muted};text-decoration:underline;">Turn it off</a>`;
  }
  if (reason.kind === "shared") return `You're receiving this because ${escapeHtml(reason.by)} shared something with you on ${product}. You don't need to do anything if this wasn't meant for you.`;
  return escapeHtml(reason.text);
}

/** The shell every email renders inside: logo, the message, a hairline, the footer. */
export function layout(bodyHtml: string, opts: { preheader: string; footer?: FooterReason }): string {
  const product = escapeHtml(env.SMTP_FROM_NAME);
  const site = env.FRONTEND_URL;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${product}</title>
  </head>
  <body style="margin:0;padding:0;background:${COLOR.page};font-family:${FONT};-webkit-text-size-adjust:100%;">
    <!-- Shown beside the subject in the inbox list, hidden in the message. -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(opts.preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.page};">
      <tr>
        <td align="center" style="padding:44px 24px 48px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
            <tr>
              <td style="padding:0 0 36px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td valign="middle" style="padding-right:9px;">
                      <img src="${site}/icons/icon-192.png" width="24" height="24" alt="" style="display:block;border:0;" />
                    </td>
                    <td valign="middle" style="font-size:15px;line-height:1;font-weight:600;letter-spacing:-.01em;color:${COLOR.text};">${product}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:40px 0 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid ${COLOR.border};font-size:0;line-height:0;">&nbsp;</td></tr></table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 0 0;font-size:12px;line-height:1.7;color:${COLOR.muted};">
                ${footerText(opts.footer ?? { kind: "account" })}
                <br />
                <a href="${site}" style="color:${COLOR.muted};text-decoration:underline;">${product}</a>
                &nbsp;&middot;&nbsp;
                <a href="${site}/help" style="color:${COLOR.muted};text-decoration:underline;">Help</a>
                &nbsp;&middot;&nbsp;
                <a href="${site}/contact" style="color:${COLOR.muted};text-decoration:underline;">Contact us</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Splits plain text on blank lines into paragraphs — the admin composer's
 * only authoring surface is a plain textarea, no rich-text editor. */
export function plainTextToHtmlParagraphs(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, i) => paragraph(escapeHtml(block).replace(/\n/g, "<br/>"), { top: i === 0 ? 16 : 14 }))
    .join("");
}

export interface EmailContent {
  subject: string;
  html: string;
}
