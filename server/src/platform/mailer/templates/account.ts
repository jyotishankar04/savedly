import { env } from "../../../config/env";
import { UserStatus } from "../../../db/enums";
import { COLOR, button, escapeHtml, eyebrow, heading, layout, panel, paragraph, steps, type EmailContent, type Tone } from "./layout";

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
  // These go from a no-reply address, so "reply" leads nowhere; the contact page is where a person
  // can reach us.
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
