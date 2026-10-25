// The email templates, one file per kind of email. layout.ts holds the shared building blocks (colours, headings, buttons, the page shell).

export { plainTextToHtmlParagraphs, type EmailContent } from "./layout";
export { welcomeEmailTemplate, userStatusChangedEmailTemplate } from "./account";
export { shareInviteEmailTemplate, shareAccessRequestedEmailTemplate, shareAccessDecisionEmailTemplate } from "./sharing";
export { type EmailBlock, type ComposedEmail, composedEmailToText, composedEmailTemplate, withUnsubscribeUrl, adminComposedEmailTemplate } from "./composed";
export { eventDetectedEmailTemplate, memoryReminderEmailTemplate, weeklyDigestEmailTemplate } from "./memories";
