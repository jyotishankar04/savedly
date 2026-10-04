import { logger } from "../../shared/utils/logger";
import { env } from "../../config/env";
import { EmailCategory, EmailTemplateKey, NotificationType, ShareResourceType } from "../../db/enums";
import { createNotification } from "../notification/notification.service";
import { sendEmail } from "../email";
import {
  shareAccessDecisionEmailTemplate,
  shareAccessRequestedEmailTemplate,
  shareInviteEmailTemplate,
} from "../../shared/mailer/templates";
import type { ShareRow } from "./share.access";

/**
 * The single seam between sharing and the notification/email subsystems.
 *
 * Every function here returns void and swallows its own failures. Sharing
 * must not fail because a notification insert lost a race or a mailbox is
 * unreachable — the share itself already succeeded by the time these run,
 * and surfacing a 500 would tell the user their action failed when it
 * didn't.
 */

function noun(share: ShareRow): string {
  return share.resourceType === ShareResourceType.COLLECTION ? "collection" : "memory";
}

/** Fire-and-forget wrapper so no caller ever has to remember to catch. */
function emit(what: string, run: () => Promise<unknown>): void {
  void run().catch((err) => logger.warn({ err }, `Failed to deliver notification: ${what}`));
}

export interface ShareInviteNotice {
  granteeUserId: string | null;
  email: string;
  share: ShareRow;
  ownerName: string | null;
}

export function notifyShareInvite(notice: ShareInviteNotice): void {
  // In-app notification only makes sense once there's an account to show it
  // in. The invite is already stored as a pending grant and activates at
  // signup — but the email below fires regardless, since it's addressed to
  // notice.email, not a userId.
  if (notice.granteeUserId) {
    emit("share invite", () =>
      createNotification({
        userId: notice.granteeUserId!,
        type: NotificationType.SHARE_INVITE_RECEIVED,
        title: `${notice.ownerName ?? "Someone"} shared a ${noun(notice.share)} with you`,
        actionUrl: `/s/${notice.share.slug}`,
        metadata: { shareId: notice.share.id, slug: notice.share.slug },
      })
    );
  }

  emit("share invite email", () => {
    const { subject, html } = shareInviteEmailTemplate({
      ownerName: notice.ownerName,
      resourceNoun: noun(notice.share),
      url: `${env.FRONTEND_URL}/s/${notice.share.slug}`,
    });
    return sendEmail({
      to: notice.email,
      recipientUserId: notice.granteeUserId,
      category: EmailCategory.TRANSACTIONAL,
      templateKey: EmailTemplateKey.SHARE_INVITE,
      subject,
      html,
    });
  });
}

export interface AccessRequestedNotice {
  ownerId: string;
  ownerEmail: string;
  requesterName: string | null;
  share: ShareRow;
  requestId: string;
}

export function notifyAccessRequested(notice: AccessRequestedNotice): void {
  emit("access requested", () =>
    createNotification({
      userId: notice.ownerId,
      type: NotificationType.SHARE_ACCESS_REQUESTED,
      title: `${notice.requesterName ?? "Someone"} wants access to your ${noun(notice.share)}`,
      body: "Approve or decline this request.",
      actionUrl: "/app/shared",
      // shareId + requestId let the notifications page approve inline,
      // rather than sending the owner off to find the right share dialog.
      metadata: {
        shareId: notice.share.id,
        requestId: notice.requestId,
        slug: notice.share.slug,
      },
    })
  );

  emit("access requested email", () => {
    const { subject, html } = shareAccessRequestedEmailTemplate({
      requesterName: notice.requesterName,
      resourceNoun: noun(notice.share),
      url: `${env.FRONTEND_URL}/app/shared`,
    });
    return sendEmail({
      to: notice.ownerEmail,
      recipientUserId: notice.ownerId,
      category: EmailCategory.TRANSACTIONAL,
      templateKey: EmailTemplateKey.SHARE_ACCESS_REQUESTED,
      subject,
      html,
    });
  });
}

export interface AccessDecisionNotice {
  requesterUserId: string;
  requesterEmail: string;
  approved: boolean;
  share: ShareRow;
}

export function notifyAccessDecision(notice: AccessDecisionNotice): void {
  emit("access decision", () =>
    createNotification({
      userId: notice.requesterUserId,
      type: notice.approved ? NotificationType.SHARE_ACCESS_APPROVED : NotificationType.SHARE_ACCESS_DENIED,
      title: notice.approved
        ? `You now have access to a shared ${noun(notice.share)}`
        : `Your access request was declined`,
      // Only link somewhere they can actually go.
      actionUrl: notice.approved ? `/s/${notice.share.slug}` : null,
      metadata: { shareId: notice.share.id, slug: notice.share.slug },
    })
  );

  emit("access decision email", () => {
    const { subject, html } = shareAccessDecisionEmailTemplate({
      approved: notice.approved,
      resourceNoun: noun(notice.share),
      url: notice.approved ? `${env.FRONTEND_URL}/s/${notice.share.slug}` : null,
    });
    return sendEmail({
      to: notice.requesterEmail,
      recipientUserId: notice.requesterUserId,
      category: EmailCategory.TRANSACTIONAL,
      templateKey: notice.approved ? EmailTemplateKey.SHARE_ACCESS_APPROVED : EmailTemplateKey.SHARE_ACCESS_DENIED,
      subject,
      html,
    });
  });
}
