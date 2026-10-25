import { env } from "../../../config/env";
import { UNSUBSCRIBE_URL_PLACEHOLDER } from "../unsubscribe";
import { COLOR, bullets, button, divider, escapeHtml, eyebrow, heading, image, layout, panel, paragraph, type EmailContent, type Tone } from "./layout";

// --- Admin-composed emails ---------------------------------------------------

/**
 * What an admin builds in the composer (Admin > Emails): an optional label and headline, then these
 * blocks in order. Each maps to a component above, so a composed email can't look different from
 * the rest.
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

/**
 * The plain-text version of a composed email: what's stored on the campaign and used for the inbox
 * preview line.
 */
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
      // Everything the composer sends is bulk mail, so it always carries the unsubscribe link.
      { preheader: text.replace(/\s+/g, " ").trim().slice(0, 120), footer: { kind: "announcement" } },
    ),
  };
}

/** Puts one recipient's own unsubscribe link into an email rendered by composedEmailTemplate. */
export function withUnsubscribeUrl(html: string, url: string): string {
  return html.split(UNSUBSCRIBE_URL_PLACEHOLDER).join(url);
}

/**
 * A plain-text email an admin writes (the announcement "notify by email" option): their subject as
 * the headline.
 */
export function adminComposedEmailTemplate({ subject, bodyText }: { subject: string; bodyText: string }): EmailContent {
  return composedEmailTemplate({ subject, content: { blocks: [{ type: "text", text: bodyText }] } });
}
