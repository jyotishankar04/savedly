import { env } from "../../config/env";
import { UserStatus } from "../../db/enums";

// -----------------------------------------------------------------------------
// The email design system.
//
// Every email is built from the pieces in this file, so they all share one
// look (the app's: white cards on a cool grey page, the brand blue, pill
// buttons) while each kind of email has its own layout.
//
// Mail clients are not browsers. Outlook renders with Word's engine and many
// clients strip <style> blocks, so everything here is tables and inline
// styles, colours are plain hex, and nothing depends on web fonts, flexbox or
// images loading (the header reads fine as text when images are blocked).
// -----------------------------------------------------------------------------

const COLOR = {
  page: "#f3f5fa",
  card: "#ffffff",
  border: "#e3e8f2",
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

const FONT = "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

type Tone = "primary" | "success" | "warning" | "danger" | "neutral";

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
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// --- Components --------------------------------------------------------------

/** The small uppercase label above a headline: what kind of email this is. */
function eyebrow(text: string, tone: Tone = "primary"): string {
  const { fg, bg } = TONE[tone];
  return `<span style="display:inline-block;padding:5px 11px;border-radius:999px;background:${bg};color:${fg};font-size:11px;line-height:1;font-weight:700;letter-spacing:.07em;text-transform:uppercase;">${escapeHtml(text)}</span>`;
}

function heading(html: string): string {
  return `<h1 style="margin:16px 0 0;font-size:24px;line-height:1.25;font-weight:700;letter-spacing:-.02em;color:${COLOR.text};">${html}</h1>`;
}

function paragraph(html: string, opts?: { muted?: boolean; top?: number }): string {
  return `<p style="margin:${opts?.top ?? 12}px 0 0;font-size:15px;line-height:1.6;color:${opts?.muted ? COLOR.muted : COLOR.body};">${html}</p>`;
}

/** The one action an email asks for. A table cell, not a styled link, so the
 * whole pill is coloured and clickable in Outlook too. */
function button(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
    <tr>
      <td bgcolor="${COLOR.primary}" style="border-radius:999px;background:${COLOR.primary};">
        <a href="${url}" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:15px;line-height:1;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

/** A tinted box that sets something apart: the shared item, the event, a notice. */
function panel(html: string, tone: Tone = "neutral"): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;">
    <tr>
      <td style="padding:16px 18px;border-radius:14px;background:${TONE[tone].bg};">${html}</td>
    </tr>
  </table>`;
}

/** A round tile holding one or two characters: a person's initial, a tick. */
function badge(content: string, tone: Tone): string {
  const { fg, bg } = TONE[tone];
  return `<table role="presentation" cellpadding="0" cellspacing="0">
    <tr>
      <td width="48" height="48" align="center" valign="middle" style="width:48px;height:48px;border-radius:999px;background:${bg};color:${fg};font-size:20px;line-height:48px;font-weight:700;">${content}</td>
    </tr>
  </table>`;
}

function initialOf(name: string | null): string {
  const first = (name ?? "").trim().charAt(0);
  return first ? escapeHtml(first.toUpperCase()) : "?";
}

/** A numbered list of next steps. */
function steps(items: { title: string; text: string }[]): string {
  const rows = items
    .map(
      (item, i) => `<tr>
        <td width="34" valign="top" style="padding:${i === 0 ? 0 : 14}px 0 0;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td width="26" height="26" align="center" valign="middle" style="width:26px;height:26px;border-radius:999px;background:${COLOR.primarySoft};color:${COLOR.primary};font-size:13px;line-height:26px;font-weight:700;">${i + 1}</td>
          </tr></table>
        </td>
        <td valign="top" style="padding:${i === 0 ? 0 : 14}px 0 0 12px;">
          <p style="margin:0;font-size:15px;line-height:1.4;font-weight:600;color:${COLOR.text};">${escapeHtml(item.title)}</p>
          <p style="margin:3px 0 0;font-size:14px;line-height:1.5;color:${COLOR.body};">${escapeHtml(item.text)}</p>
        </td>
      </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">${rows}</table>`;
}

/** A short list of points, each with a small blue dot. */
function bullets(items: string[]): string {
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

function image(url: string, alt: string): string {
  return `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" width="456" style="display:block;width:100%;max-width:456px;height:auto;margin:20px 0 0;border:0;border-radius:14px;" />`;
}

function divider(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;"><tr><td style="border-top:1px solid ${COLOR.border};font-size:0;line-height:0;">&nbsp;</td></tr></table>`;
}

/** The calendar tile the app shows for an event: month over day. */
function dateTile(date: Date): string {
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
type FooterReason = { kind: "account" } | { kind: "shared"; by: string } | { kind: "custom"; text: string };

function footerText(reason: FooterReason): string {
  const product = escapeHtml(env.SMTP_FROM_NAME);
  if (reason.kind === "account") return `You're receiving this because you have a ${product} account.`;
  if (reason.kind === "shared") return `You're receiving this because ${escapeHtml(reason.by)} shared something with you on ${product}. You don't need to do anything if this wasn't meant for you.`;
  return escapeHtml(reason.text);
}

/** The shell every email renders inside: logo, one white card, footer. */
function layout(bodyHtml: string, opts: { preheader: string; footer?: FooterReason }): string {
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
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
            <tr>
              <td style="padding:0 6px 20px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td valign="middle" style="padding-right:10px;">
                      <img src="${site}/icons/icon-192.png" width="30" height="30" alt="" style="display:block;border:0;" />
                    </td>
                    <td valign="middle" style="font-size:17px;line-height:1;font-weight:700;letter-spacing:-.01em;color:${COLOR.text};">${product}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;border-radius:20px;background:${COLOR.card};border:1px solid ${COLOR.border};">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 6px 0;font-size:12px;line-height:1.6;color:${COLOR.muted};">
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

// --- Templates ---------------------------------------------------------------

/** Welcome: a greeting and the three things worth doing first. */
export function welcomeEmailTemplate({ name }: { name: string | null }): EmailContent {
  const product = env.SMTP_FROM_NAME;
  return {
    subject: `Welcome to ${product}`,
    html: layout(
      `${eyebrow("Welcome")}
      ${heading(name ? `Your library is ready, ${escapeHtml(name)}.` : "Your library is ready.")}
      ${paragraph(`Save anything you come across: links, notes, videos, images and files. ${escapeHtml(product)} organizes it and helps you find it again later, even when you've forgotten what it was called.`)}
      ${steps([
        { title: "Save your first thing", text: "Paste a link or type a note in Quick Capture." },
        { title: "Put it on your phone", text: "Open the site on your phone and choose Install to add it to your home screen." },
        { title: "Ask your library", text: "Search by what you remember, or ask a question in plain words." },
      ])}
      ${button("Open your library", `${env.FRONTEND_URL}/app`)}`,
      { preheader: "Three things worth doing first." },
    ),
  };
}

const STATUS_COPY: Record<UserStatus, { subject: string; label: string; tone: Tone; headline: string; body: string; contact: boolean; signIn: boolean }> = {
  [UserStatus.BANNED]: {
    subject: "Your account has been banned",
    label: "Account banned",
    tone: "danger",
    headline: "Your account has been banned",
    body: "Your account was banned for violating our terms of service, and you can no longer sign in.",
    contact: true,
    signIn: false,
  },
  [UserStatus.SUSPENDED]: {
    subject: "Your account has been suspended",
    label: "Account suspended",
    tone: "warning",
    headline: "Your account is suspended",
    body: "Your account has been temporarily suspended, and you can't sign in for now.",
    contact: true,
    signIn: false,
  },
  [UserStatus.ACTIVE]: {
    subject: "Your account is active again",
    label: "Account restored",
    tone: "success",
    headline: "You're back in",
    body: "Your account has been reactivated. Everything you saved is where you left it.",
    contact: false,
    signIn: true,
  },
  [UserStatus.INACTIVE]: {
    subject: "Your account status has changed",
    label: "Account update",
    tone: "neutral",
    headline: "Your account is inactive",
    body: "Your account has been marked inactive.",
    contact: true,
    signIn: false,
  },
  [UserStatus.DELETED]: {
    subject: "Your account has been deleted",
    label: "Account deleted",
    tone: "neutral",
    headline: "Your account has been deleted",
    body: "Your account and the data in it have been deleted.",
    contact: false,
    signIn: false,
  },
};

/** Account status: a coloured notice, and where to turn if it's a mistake. */
export function userStatusChangedEmailTemplate({ name, status }: { name: string | null; status: UserStatus }): EmailContent {
  const copy = STATUS_COPY[status];
  // These go out from a no-reply address, so "reply to this email" would
  // lead nowhere: the contact page is where a person can actually reach us.
  const contact = copy.contact
    ? panel(
        `<p style="margin:0;font-size:14px;line-height:1.55;color:${COLOR.body};">Think this is a mistake, or have a question? <a href="${env.FRONTEND_URL}/contact" style="color:${COLOR.primary};font-weight:600;text-decoration:underline;">Contact us</a> and we'll look into it.</p>`,
      )
    : "";
  return {
    subject: copy.subject,
    html: layout(
      `${eyebrow(copy.label, copy.tone)}
      ${heading(escapeHtml(copy.headline))}
      ${paragraph(name ? `Hi ${escapeHtml(name)},` : "Hi,", { top: 16 })}
      ${paragraph(escapeHtml(copy.body), { top: 8 })}
      ${contact}
      ${copy.signIn ? button("Sign in", `${env.FRONTEND_URL}/auth/login`) : ""}`,
      { preheader: copy.body },
    ),
  };
}

/** Share invitation: who shared, and what, as a card. */
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
  const product = env.SMTP_FROM_NAME;
  return {
    subject: `${who} shared a ${resourceNoun} with you`,
    html: layout(
      `${badge(initialOf(ownerName), "primary")}
      ${heading(`${escapeHtml(who)} shared a ${escapeHtml(resourceNoun)} with you`)}
      ${paragraph(`They saved it in ${escapeHtml(product)} and want you to see it.`)}
      ${panel(
        `<p style="margin:0;font-size:11px;line-height:1;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:${COLOR.muted};">Shared ${escapeHtml(resourceNoun)}</p>
         <p style="margin:7px 0 0;font-size:15px;line-height:1.4;font-weight:600;color:${COLOR.text};">From ${escapeHtml(who)}</p>`,
      )}
      ${button(`View the ${resourceNoun}`, url)}`,
      { preheader: `${who} wants you to see something they saved.`, footer: { kind: "shared", by: who } },
    ),
  };
}

/** Access requested: who is asking, sent to the owner to decide. */
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
    html: layout(
      `${eyebrow("Access request", "warning")}
      ${heading(`${escapeHtml(who)} wants access`)}
      ${paragraph(`They've asked to see a ${escapeHtml(resourceNoun)} you shared. Nobody gets in until you approve.`)}
      ${panel(
        `<table role="presentation" cellpadding="0" cellspacing="0"><tr>
           <td valign="middle" style="padding-right:14px;">${badge(initialOf(requesterName), "warning")}</td>
           <td valign="middle">
             <p style="margin:0;font-size:15px;line-height:1.3;font-weight:600;color:${COLOR.text};">${escapeHtml(who)}</p>
             <p style="margin:3px 0 0;font-size:13px;line-height:1.4;color:${COLOR.body};">Waiting for your decision</p>
           </td>
         </tr></table>`,
      )}
      ${button("Review the request", url)}`,
      { preheader: `Approve or decline their request to see your ${resourceNoun}.` },
    ),
  };
}

/** Access decision: a clear yes with a way in, or a quiet no. */
export function shareAccessDecisionEmailTemplate({
  approved,
  resourceNoun,
  url,
}: {
  approved: boolean;
  resourceNoun: string;
  url: string | null;
}): EmailContent {
  if (approved) {
    return {
      subject: `You now have access to a shared ${resourceNoun}`,
      html: layout(
        `${badge("&#10003;", "success")}
        ${heading("You're in")}
        ${paragraph(`Your request was approved. You can now open the ${escapeHtml(resourceNoun)}.`)}
        ${url ? button(`Open the ${resourceNoun}`, url) : ""}`,
        { preheader: `Your request to see a shared ${resourceNoun} was approved.`, footer: { kind: "custom", text: `You're receiving this because you asked for access to something shared on ${env.SMTP_FROM_NAME}.` } },
      ),
    };
  }
  return {
    subject: "Your access request was declined",
    html: layout(
      `${eyebrow("Access request", "neutral")}
      ${heading("Your request was declined")}
      ${paragraph(`The owner didn't approve your request to see this ${escapeHtml(resourceNoun)}.`)}
      ${paragraph("If you think that's a mistake, ask them to share it with you again.", { muted: true })}`,
      { preheader: `The owner didn't approve your request.`, footer: { kind: "custom", text: `You're receiving this because you asked for access to something shared on ${env.SMTP_FROM_NAME}.` } },
    ),
  };
}

// --- Admin-composed emails ---------------------------------------------------

/**
 * What an admin builds in the composer (Admin > Emails): an optional label
 * and headline, then any number of these blocks in order. Every block maps
 * to one of the components above, so a composed email can only ever look
 * like the rest of the system — there is no HTML to write or get wrong.
 */
export type EmailBlock =
  | { type: "text"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "button"; label: string; url: string }
  | { type: "note"; text: string; tone?: Tone }
  | { type: "image"; url: string; alt?: string }
  | { type: "divider" };

export interface ComposedEmail {
  /** The small label above the headline, e.g. "New". Defaults to "From the <product> team". */
  label?: string;
  tone?: Tone;
  /** Defaults to the subject. */
  headline?: string;
  blocks: EmailBlock[];
}

/** A link the composer was given: a full address, or a path inside the site ("/app/capture"). */
function absoluteUrl(url: string): string {
  return url.startsWith("/") ? `${env.FRONTEND_URL}${url}` : url;
}

function renderBlock(block: EmailBlock, isFirst: boolean): string {
  switch (block.type) {
    case "text":
      return block.text
        .split(/\n\s*\n/)
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part, i) => paragraph(escapeHtml(part).replace(/\n/g, "<br/>"), { top: isFirst && i === 0 ? 16 : 14 }))
        .join("");
    case "bullets":
      return bullets(block.items);
    case "button":
      return button(block.label, absoluteUrl(block.url));
    case "note":
      return panel(`<p style="margin:0;font-size:14px;line-height:1.55;color:${COLOR.text};">${escapeHtml(block.text).replace(/\n/g, "<br/>")}</p>`, block.tone ?? "neutral");
    case "image":
      return image(block.url, block.alt ?? "");
    case "divider":
      return divider();
  }
}

/** The plain-text version of a composed email: what's stored on the campaign and used for the inbox preview line. */
export function composedEmailToText(content: ComposedEmail): string {
  return content.blocks
    .map((block) => {
      switch (block.type) {
        case "text":
        case "note":
          return block.text.trim();
        case "bullets":
          return block.items.map((item) => `- ${item}`).join("\n");
        case "button":
          return `${block.label}: ${absoluteUrl(block.url)}`;
        case "image":
          return block.alt ? `[${block.alt}]` : "";
        case "divider":
          return "";
      }
    })
    .filter(Boolean)
    .join("\n\n");
}

/** An email built in the admin composer. */
export function composedEmailTemplate({ subject, content }: { subject: string; content: ComposedEmail }): EmailContent {
  const text = composedEmailToText(content);
  return {
    subject,
    html: layout(
      `${eyebrow(content.label?.trim() || `From the ${env.SMTP_FROM_NAME} team`, content.tone ?? "primary")}
      ${heading(escapeHtml(content.headline?.trim() || subject))}
      ${content.blocks.map((block, i) => renderBlock(block, i === 0)).join("")}`,
      { preheader: text.replace(/\s+/g, " ").trim().slice(0, 120) },
    ),
  };
}

/** A plain-text email an admin writes (the announcement "notify by email" option): their subject as the headline. */
export function adminComposedEmailTemplate({ subject, bodyText }: { subject: string; bodyText: string }): EmailContent {
  return composedEmailTemplate({ subject, content: { blocks: [{ type: "text", text: bodyText }] } });
}

/** Event detected: the date as a calendar tile, the way the app shows it. */
export function eventDetectedEmailTemplate({
  title,
  eventAt,
  url,
}: {
  title: string;
  eventAt: string;
  url: string;
}): EmailContent {
  const date = new Date(eventAt);
  const when = date.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" });
  return {
    subject: `We spotted an event in "${title}"`,
    html: layout(
      `${eyebrow("Event found")}
      ${heading("Is this an event?")}
      ${paragraph("We noticed a date in something you saved.")}
      ${panel(
        `<table role="presentation" cellpadding="0" cellspacing="0"><tr>
           <td valign="middle" style="padding-right:14px;">${dateTile(date)}</td>
           <td valign="middle">
             <p style="margin:0;font-size:15px;line-height:1.35;font-weight:600;color:${COLOR.text};">${escapeHtml(title)}</p>
             <p style="margin:4px 0 0;font-size:13px;line-height:1.4;color:${COLOR.body};">${escapeHtml(when)}</p>
           </td>
         </tr></table>`,
      )}
      ${button("Review and add to calendar", url)}
      ${paragraph("Nothing is added until you confirm it.", { muted: true, top: 14 })}`,
      { preheader: `${title}: ${when}` },
    ),
  };
}
