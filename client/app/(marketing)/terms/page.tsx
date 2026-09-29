"use client";

import React from "react";
import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";
import { GITHUB_CONFIGURED, GITHUB_URL, LICENSE } from "@/lib/open-source";

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-primary/[0.03] via-background to-background text-foreground font-sans">
      <Navbar />

      <main className="flex-1 pt-32 pb-20 max-w-4xl mx-auto px-6">

        {/* Header */}
        <div className="text-center space-y-4 mb-16">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
            Legal Policy
          </span>
          <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-foreground leading-[1.15]">
            Terms of Service
          </h1>
          <p className="text-muted-foreground text-xs font-mono">
            Last Updated: September 2026
          </p>
        </div>

        {/* Content text */}
        <div className="prose prose-zinc dark:prose-invert max-w-none text-xs leading-relaxed text-foreground/80 space-y-8">

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">1. Agreement to terms</h2>
            <p>
              By accessing or using SaveForLatter — the web dashboard or browser extension — you agree to these Terms of Service. If you don&apos;t agree, please don&apos;t use the service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">2. Account registration</h2>
            <p>
              You sign in with Google or GitHub, or with an email and password where that&apos;s enabled. You&apos;re responsible for keeping those sign-in details secure, and for telling us if you believe your SaveForLatter account has been accessed without your permission.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">3. Open source, free plan and paid plans</h2>
            <p>
              SaveForLatter is open source{LICENSE ? ` (${LICENSE} licensed)` : ""}. You can run your own copy for free, with every feature and no limits. On the hosted service at this website, every plan includes every feature; plans differ only in storage and usage limits and in whether we supply the AI. The Free plan costs nothing. Current plans and limits are listed on the <a href="/pricing" className="text-primary hover:underline">pricing page</a>.
              {GITHUB_CONFIGURED ? (
                <>
                  {" "}The source code is public at <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{GITHUB_URL}</a>, and you&apos;re welcome to read it, self-host it, or contribute to it under that license.
                </>
              ) : null}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">3a. Paying for a plan</h2>
            <p>
              Payments are processed by Dodo Payments, which acts as the merchant of record: it charges you, handles sales tax, VAT or GST, and issues your invoices. A paid plan renews automatically each billing period until you cancel. You can cancel at any time from Settings → Plan &amp; usage → Manage billing; you keep the paid plan until the end of the period you&apos;ve paid for, and then move to the Free plan. Your saved content is never deleted because a plan ends, but new saves and uploads follow the Free plan&apos;s limits. If you believe you were charged in error, contact us and we&apos;ll look into it.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">4. Bringing your own AI provider</h2>
            <p>
              AI features (summaries, tags, image analysis, semantic search, and the Ask assistant) run on an AI provider account you connect yourself — OpenAI, Anthropic, Groq, Google, or any OpenAI-compatible endpoint — under Settings → AI. Using AI features means:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>You&apos;re responsible for that provider account, any costs it incurs, and complying with that provider&apos;s own terms of service.</li>
              <li>Content you save or ask about is sent to the provider you&apos;ve chosen to be processed — see the <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a> for exactly how that works.</li>
              <li>We aren&apos;t responsible for a third-party AI provider&apos;s output, availability, or behavior — an inaccurate summary or a wrong answer from a model you&apos;ve connected isn&apos;t something we control.</li>
            </ul>
            <p>
              Two exceptions: embeddings (semantic search), which we cover by default at no cost to you unless you connect your own; and included AI — a monthly allowance of AI processing on our own provider account. On paid plans all AI runs this way; on the Free plan it&apos;s used only when you haven&apos;t connected your own key. See the Privacy Policy for how both work.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">5. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Upload malicious code, or attempt to disrupt, overload, or gain unauthorized access to our infrastructure.</li>
              <li>Scrape, reverse-engineer, or attempt to extract other users&apos; data.</li>
              <li>Save or share content you don&apos;t have the right to store, or that&apos;s illegal where you or the recipient are located.</li>
              <li>Use a share link, invite, or access-request feature to harass someone or to gain access to content you weren&apos;t meant to see.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">6. Your content</h2>
            <p>
              Whatever you save — links, notes, files, voice recordings — is yours. We don&apos;t claim ownership of it, and we only store, process, and display it back to you (and to anyone you explicitly choose to share it with) in order to run the service. You can export or permanently delete it at any time from Settings → Privacy &amp; Data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">7. Service provided &ldquo;as is&rdquo;</h2>
            <p>
              Whether you use a free or a paid plan, the service comes with no support contract or uptime guarantee. We work to keep it reliable, but it&apos;s provided as-is, without warranties of any kind, and we&apos;re not liable for lost data, downtime, or indirect damages arising from its use — to the fullest extent the law allows.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">8. Termination</h2>
            <p>
              You can delete your account at any time from Settings → Privacy &amp; Data — this is permanent. We may suspend or terminate an account that violates Section 5 (Acceptable use). Memories you delete are held in Trash for 15 days before permanent removal, same as if you&apos;d deleted them yourself.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">9. Changes to these terms</h2>
            <p>
              If these terms change in a meaningful way, we&apos;ll update the date at the top of this page.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">10. Contact</h2>
            <p>
              Questions about these terms can be sent through the <a href="/contact" className="text-primary hover:underline">contact page</a>.
            </p>
          </section>

        </div>

      </main>

      <MainFooter />
    </div>
  );
}
