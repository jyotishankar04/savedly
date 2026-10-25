import { COLOR, button, dateTile, escapeHtml, eyebrow, heading, layout, panel, paragraph, type EmailContent } from "./layout";

/** Event detected: the date as a calendar tile, the way the app shows it. */
export function eventDetectedEmailTemplate({
  title,
  eventAt,
  url,
  timeZone,
}: {
  title: string;
  eventAt: string;
  url: string;
  /** The reader's time zone. Without it the time would be the server's (UTC in production). */
  timeZone?: string;
}): EmailContent {
  const date = new Date(eventAt);
  const when = date.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short", timeZone: timeZone ?? "UTC" }) + (timeZone ? "" : " UTC");
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

/** "Remind me": a memory the user asked to come back to. */
export function memoryReminderEmailTemplate({
  title,
  summary,
  link,
  url,
  settingsUrl,
}: {
  title: string;
  /** What Savedly understood it to be, when it has a summary. */
  summary?: string | null;
  /** The page itself, for a saved link. */
  link?: string | null;
  /** The memory in Savedly. */
  url: string;
  /** Where to turn these emails off. */
  settingsUrl: string;
}): EmailContent {
  const about = summary ? (summary.length > 220 ? `${summary.slice(0, 220).trimEnd()}…` : summary) : null;
  return {
    subject: `Reminder: ${title}`,
    html: layout(
      `${eyebrow("Reminder")}
      ${heading("You asked to come back to this")}
      ${panel(
        `<p style="margin:0;font-size:15px;line-height:1.35;font-weight:600;color:${COLOR.text};">${escapeHtml(title)}</p>
         ${about ? `<p style="margin:6px 0 0;font-size:13px;line-height:1.5;color:${COLOR.body};">${escapeHtml(about)}</p>` : ""}
         ${link ? `<p style="margin:8px 0 0;font-size:12px;line-height:1.4;color:${COLOR.body};word-break:break-all;">${escapeHtml(link)}</p>` : ""}`,
      )}
      ${button("Open in Savedly", url)}
      ${paragraph(`It's back at the top of your Inbox. <a href="${escapeHtml(settingsUrl)}" style="color:${COLOR.body};">Turn off reminder emails</a>`, { muted: true, top: 14 })}`,
      { preheader: about ?? title },
    ),
  };
}

/** "3 days ago", "2 weeks ago": how long a save has been waiting. */
function waitingFor(iso: string, now: Date): string {
  const days = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

/**
 * The weekly email: a few saves from the Inbox that haven't been read yet,
 * each a link into Savedly with where it's from and how long it's waited.
 */
export function weeklyDigestEmailTemplate({
  name,
  items,
  unreadCount,
  savedThisWeek,
  inboxUrl,
  settingsUrl,
  now = new Date(),
}: {
  name: string | null;
  items: { title: string; summary: string | null; source: string | null; url: string; createdAt: string }[];
  /** Everything unread in the Inbox, of which `items` are the first few. */
  unreadCount: number;
  savedThisWeek: number;
  inboxUrl: string;
  settingsUrl: string;
  now?: Date;
}): EmailContent {
  const count = items.length;
  const headline = `${count === 1 ? "One thing" : `${count} things`} waiting to be read`;
  const intro =
    savedThisWeek > 0
      ? `${name ? `${escapeHtml(name)}, you` : "You"} saved ${savedThisWeek === 1 ? "one thing" : `${savedThisWeek} things`} this week. Here's what's still in your Inbox, oldest first.`
      : `${name ? `${escapeHtml(name)}, here's` : "Here's"} what's still in your Inbox, oldest first.`;
  const rows = items
    .map((item, i) => {
      const about = item.summary ? (item.summary.length > 140 ? `${item.summary.slice(0, 140).trimEnd()}…` : item.summary) : null;
      const meta = [item.source, `saved ${waitingFor(item.createdAt, now)}`].filter(Boolean).map((part) => escapeHtml(part as string)).join(" &middot; ");
      return `<tr>
        <td style="padding:${i === 0 ? 0 : 18}px 0 18px;${i === 0 ? "" : `border-top:1px solid ${COLOR.border};`}">
          <a href="${escapeHtml(item.url)}" style="font-size:15px;line-height:1.45;font-weight:600;color:${COLOR.text};text-decoration:none;">${escapeHtml(item.title)}</a>
          ${about ? `<p style="margin:5px 0 0;font-size:14px;line-height:1.55;color:${COLOR.body};">${escapeHtml(about)}</p>` : ""}
          <p style="margin:6px 0 0;font-size:12px;line-height:1.4;color:${COLOR.muted};">${meta}</p>
        </td>
      </tr>`;
    })
    .join("");
  const more = unreadCount - count;
  return {
    subject: headline,
    html: layout(
      `${eyebrow("Your week")}
      ${heading(headline)}
      ${paragraph(intro)}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:26px 0 0;">${rows}</table>
      ${more > 0 ? paragraph(`And ${more === 1 ? "one more" : `${more} more`} in your Inbox.`, { muted: true, top: 4 }) : ""}
      ${button("Open your Inbox", inboxUrl)}`,
      { preheader: items.map((item) => item.title).slice(0, 3).join(" · "), footer: { kind: "setting", what: "the weekly email", settingsUrl } },
    ),
  };
}
