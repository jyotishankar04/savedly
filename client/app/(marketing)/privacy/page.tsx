"use client";

import React from "react";
import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";
import { SELF_HOSTED } from "@/lib/instance";
import { HostedPolicyNotice } from "@/components/self-hosted/plain-chrome";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/contact";

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-primary/[0.03] via-background to-background text-foreground font-sans">
      <Navbar />

      <main className="flex-1 pt-32 pb-20 max-w-4xl mx-auto px-6">

        {SELF_HOSTED && <HostedPolicyNotice />}

        {/* Header */}
        <div className="text-center space-y-4 mb-16">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
            Legal Policy
          </span>
          <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-foreground leading-[1.15]">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground text-xs font-mono">
            Last Updated: October 2026
          </p>
        </div>

        {/* Content text */}
        <div className="prose prose-zinc dark:prose-invert max-w-none text-xs leading-relaxed text-foreground/80 space-y-8">

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">1. Introduction</h2>
            <p>
              Savedly is a personal memory tool: you save links, notes, images, documents, and voice memos, and it reads, organizes, and helps you find them again. This is open source software — the code is public, and you can run your own copy. The hosted service has a free plan and optional paid plans. This policy explains what information we collect, how it&apos;s used, and what choices you have.
            </p>
            <p>
              Your saved content belongs to you. We don&apos;t sell it, we don&apos;t use it to train AI models, and we don&apos;t show you ads.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">2. Information we collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Saved memories:</strong> the URLs, text, files, and voice recordings you explicitly choose to save, plus the AI-generated summaries, tags, and enrichment computed from them (see Section 3).</li>
              <li><strong>Account info:</strong> your name, email, and avatar as provided by Google or GitHub when you sign in with them. We never see or store your Google or GitHub password. What we receive from Google is described in <a href="#google-user-data" className="text-primary hover:underline">Section 4</a>.</li>
              <li><strong>Calendar access:</strong> if you connect Google Calendar, access to your calendar events (see <a href="#google-user-data" className="text-primary hover:underline">Section 4</a>).</li>
              <li><strong>GitHub stars:</strong> if you connect GitHub, your GitHub username and the list of public repositories you have starred (name, description, topics). We don&apos;t request access to your code or to private repositories. The access token GitHub gives us is encrypted before it is stored, and disconnecting deletes it and asks GitHub to revoke it. Repositories already added to your library stay until you delete them.</li>
              <li><strong>Payments:</strong> if you buy a paid plan, Dodo Payments (our merchant of record) collects your payment details — card, UPI or other method — and we never see or store them. We keep only the customer and subscription identifiers Dodo gives us and the status of your plan.</li>
              <li><strong>Usage metadata:</strong> device/browser info, IP address, and basic activity logs (e.g. login timestamps), used for security and to keep the service running reliably.</li>
              <li><strong>Content you share with others:</strong> if you create a share link or invite someone to a memory or collection, the information needed to fulfill that (e.g. the invitee&apos;s email) is stored until you revoke it.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">3. How AI processing works</h2>
            <p>
              On the hosted service, AI features (summaries, tags, image analysis, semantic search, the Ask assistant) run on AI provider accounts we operate. When something needs AI, the relevant piece of your content (what you save, or the question you ask along with the saved content it draws on) is sent to that provider to be processed, and the result (the summary, tags, or answer) is written back into your account. We don&apos;t keep the provider&apos;s response beyond that.
            </p>
            <p>
              If you self-host Savedly, your install sends this content to the AI provider you or your admin configure instead, and none of it reaches us.
            </p>
            <p>
              <strong>We do not use your saved content, your questions, or your AI provider responses to train any model — ours or anyone else&apos;s.</strong>
            </p>
          </section>

          <section id="google-user-data" className="space-y-3 scroll-mt-28">
            <h2 className="text-base font-bold text-foreground">4. Google user data</h2>
            <p>
              This section covers the information Savedly receives from Google when you sign in with Google or connect Google Calendar. Both are optional: you can sign in another way, and you can use Savedly without connecting a calendar.
            </p>

            <h3 className="text-sm font-semibold text-foreground pt-1">What we access</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>When you sign in with Google:</strong> your name, email address, profile picture and Google account ID. We request only the <code>openid</code>, <code>email</code> and <code>profile</code> permissions.</li>
              <li><strong>When you connect Google Calendar:</strong> the events on your calendar, through the <code>calendar.events</code> permission. This lets Savedly view, create, change and delete events. We don&apos;t request access to your calendar settings, your other calendars&apos; sharing settings, your contacts, your Gmail or your Drive.</li>
            </ul>

            <h3 className="text-sm font-semibold text-foreground pt-1">How we use it</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Your name, email and picture</strong> are used to create your account, sign you in, show your profile inside the app, and send you emails about your account, such as a welcome message or a sharing invitation.</li>
              <li><strong>Your calendar events</strong> are used to show your upcoming events on the Calendar page next to the events from your saved items, to add an event to your Google Calendar when you choose to, and to update or delete an event when you edit or remove it in Savedly.</li>
              <li>If you ask the Ask assistant about your schedule (for example, &ldquo;what&apos;s on this week?&rdquo;), the title and time of the relevant events are read so it can answer you.</li>
            </ul>
            <p>
              We use Google user data only to provide these features to you. We don&apos;t use it for advertising, we don&apos;t sell it, and we don&apos;t use it to build profiles of you.
            </p>

            <h3 className="text-sm font-semibold text-foreground pt-1">Who we share it with</h3>
            <p>
              We don&apos;t sell Google user data or share it with advertisers or data brokers. It is disclosed only in these cases:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Service providers that run Savedly for us:</strong> our cloud hosting and database providers store your account information on our behalf, and our email delivery provider receives your email address so we can send you account emails. They process it only on our instructions.</li>
              <li><strong>Our AI provider, only when you ask:</strong> when you ask the Ask assistant about your schedule, the titles and times of the events needed to answer are sent to the AI provider that processes your question, together with the question. This happens only as a direct result of your request.</li>
              <li><strong>Google:</strong> when you add, change or delete an event, we send that change to Google Calendar, since that is the action you asked for.</li>
              <li><strong>When the law requires it:</strong> if we are legally compelled to disclose information, or to protect against fraud or abuse.</li>
            </ul>
            <p>
              <strong>We don&apos;t use Google user data, including data from Google Workspace APIs such as Google Calendar, to develop, improve or train generalized or non-personalized AI or machine-learning models.</strong> It is sent to our AI provider through its API only to answer your question, under terms that don&apos;t permit the provider to train its models on it.
            </p>

            <h3 className="text-sm font-semibold text-foreground pt-1">How we protect it</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>All traffic between your browser, our servers and Google is encrypted in transit with HTTPS (TLS).</li>
              <li>The access and refresh tokens Google gives us for your calendar are encrypted with AES-256-GCM before they are stored, using a key kept separately from the database.</li>
              <li>Your session is held in cookies that scripts on the page can&apos;t read, and every request for your data is checked against your account, so one person can&apos;t reach another&apos;s.</li>
              <li>Access to our production systems is limited to the people who operate the service.</li>
              <li>The source code is public, so how this data is handled can be checked directly.</li>
            </ul>

            <h3 className="text-sm font-semibold text-foreground pt-1">How long we keep it, and how to delete it</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Calendar events are not copied into our database.</strong> We read them from Google when you open the Calendar page or ask about your schedule. For an event you add to Google Calendar from Savedly, we keep only its Google event ID and link, so we can update or remove that event later.</li>
              <li><strong>Calendar tokens</strong> are kept until you disconnect Google Calendar from the Integrations page. Disconnecting deletes them from our database and asks Google to revoke them.</li>
              <li><strong>Your name, email and picture</strong> are kept for as long as you have an account.</li>
              <li><strong>Deleting your account</strong> (Settings → Privacy &amp; Data) removes your profile, your saved content and any calendar connection. You can delete immediately, or deactivate with a 30-day period in which signing in again cancels the deletion.</li>
              <li>You can also remove Savedly&apos;s access at any time from your Google Account, under Security → Third-party apps and services.</li>
            </ul>

            <h3 className="text-sm font-semibold text-foreground pt-1">Google API Services User Data Policy</h3>
            <p>
              Savedly&apos;s use and transfer to any other app of information received from Google APIs will adhere to the{" "}
              <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer" className="text-primary hover:underline">
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">5. Where your data is stored</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Files and attachments</strong> (images, documents, voice recordings) are stored in Cloudflare R2 object storage.</li>
              <li><strong>Everything else</strong> — memory records, tags, collections, account data, encrypted AI keys — lives in our primary database.</li>
              <li><strong>Vault:</strong> memories you move into the Vault are gated behind a PIN you set (hashed, never stored in plain text) and hidden from every normal view. This is access control, not end-to-end encryption of the content itself — worth knowing plainly rather than implying more than it is.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">6. Cookies and sessions</h2>
            <p>
              We use a small number of functional cookies to keep you signed in and to verify access to password-protected or Vault-gated content — nothing used for advertising or cross-site tracking.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">7. Your rights and controls</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Export a complete copy of everything you&apos;ve saved, at any time, from Settings → Privacy &amp; Data.</li>
              <li>Delete individual memories (moved to Trash, permanently removed after 15 days) or delete your entire account and everything tied to it.</li>
              <li>Remove or rotate any AI provider key you&apos;ve connected at any time — deleting a key immediately stops it from being used.</li>
              <li>Revoke a share link or a specific person&apos;s access to something you&apos;ve shared, at any time.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">8. Changes to this policy</h2>
            <p>
              If this policy changes in a meaningful way, we&apos;ll update the date at the top of this page. Since the source code is public, the actual data handling described here can always be verified directly against it.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">9. Contact</h2>
            <p>
              Questions about this policy or your data can be sent to <a href={SUPPORT_MAILTO} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>.
            </p>
          </section>

        </div>

      </main>

      <MainFooter />
    </div>
  );
}
