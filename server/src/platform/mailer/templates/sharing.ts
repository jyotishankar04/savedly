import { env } from "../../../config/env";
import { COLOR, badge, button, escapeHtml, eyebrow, heading, initialOf, layout, panel, paragraph, type EmailContent } from "./layout";

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
