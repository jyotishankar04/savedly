"use client";

import React from "react";
import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="text-muted-foreground text-xs font-mono">
            Last Updated: September 2026
          </p>
        </div>

        {/* Content text */}
        <div className="prose prose-zinc dark:prose-invert max-w-none text-xs leading-relaxed text-foreground/80 space-y-8">

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">1. Introduction</h2>
            <p>
              SaveForLatter is a personal memory tool: you save links, notes, images, documents, and voice memos, and it reads, organizes, and helps you find them again. This is open source software — the code is public, and you can run your own copy. The hosted service has a free plan and an optional paid plan. This policy explains what information we collect, how it&apos;s used, and what choices you have.
            </p>
            <p>
              Your saved content belongs to you. We don&apos;t sell it, we don&apos;t use it to train AI models, and we don&apos;t show you ads.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">2. Information we collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Saved memories:</strong> the URLs, text, files, and voice recordings you explicitly choose to save, plus the AI-generated summaries, tags, and enrichment computed from them (see Section 3).</li>
              <li><strong>Account info:</strong> your name, email, and avatar as provided by Google or GitHub OAuth. We never see or store a password — sign-in is handled entirely by whichever provider you choose.</li>
              <li><strong>Payments:</strong> if you buy a paid plan, Dodo Payments (our merchant of record) collects your payment details — card, UPI or other method — and we never see or store them. We keep only the customer and subscription identifiers Dodo gives us and the status of your plan.</li>
              <li><strong>AI provider keys:</strong> if you connect your own OpenAI, Anthropic, Groq, Google, or other API key under Settings → AI, that key is encrypted at rest (AES-256-GCM) and used only to make AI calls on your behalf. We never display it back to you in full once saved, and it&apos;s never used for any account but yours.</li>
              <li><strong>Usage metadata:</strong> device/browser info, IP address, and basic activity logs (e.g. login timestamps), used for security and to keep the service running reliably.</li>
              <li><strong>Content you share with others:</strong> if you create a share link or invite someone to a memory or collection, the information needed to fulfill that (e.g. the invitee&apos;s email) is stored until you revoke it.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">3. How AI processing works</h2>
            <p>
              AI features (summaries, tags, image analysis, semantic search, the Ask assistant) are bring-your-own-key: when you connect a provider under Settings → AI, the relevant piece of your saved content is sent to <em>that provider</em> — the one you chose and pay — to be processed. We don&apos;t see or store that provider&apos;s response to you beyond what&apos;s written back into your account (the summary, tags, or answer itself).
            </p>
            <p>
              Two exceptions. Embeddings (what powers semantic search): unless you&apos;ve configured your own embeddings key, we use our own default provider to generate them at no cost to you, since it&apos;s inexpensive to run. And included AI: on the AI included plan, and on the Free plan when you haven&apos;t connected your own key for that task, the content being processed (what you save, or the question you ask along with the saved content it draws on) is sent to an AI provider on our account. On plans where you bring your own key, connecting it under Settings → AI switches that task to your provider at any time.
            </p>
            <p>
              <strong>We do not use your saved content, your questions, or your AI provider responses to train any model — ours or anyone else&apos;s.</strong>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">4. Where your data is stored</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Files and attachments</strong> (images, documents, voice recordings) are stored in Cloudflare R2 object storage.</li>
              <li><strong>Everything else</strong> — memory records, tags, collections, account data, encrypted AI keys — lives in our primary database.</li>
              <li><strong>Vault:</strong> memories you move into the Vault are gated behind a PIN you set (hashed, never stored in plain text) and hidden from every normal view. This is access control, not end-to-end encryption of the content itself — worth knowing plainly rather than implying more than it is.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">5. Cookies and sessions</h2>
            <p>
              We use a small number of functional cookies to keep you signed in and to verify access to password-protected or Vault-gated content — nothing used for advertising or cross-site tracking.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">6. Your rights and controls</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Export a complete copy of everything you&apos;ve saved, at any time, from Settings → Privacy &amp; Data.</li>
              <li>Delete individual memories (moved to Trash, permanently removed after 15 days) or delete your entire account and everything tied to it.</li>
              <li>Remove or rotate any AI provider key you&apos;ve connected at any time — deleting a key immediately stops it from being used.</li>
              <li>Revoke a share link or a specific person&apos;s access to something you&apos;ve shared, at any time.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">7. Changes to this policy</h2>
            <p>
              If this policy changes in a meaningful way, we&apos;ll update the date at the top of this page. Since the source code is public, the actual data handling described here can always be verified directly against it.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">8. Contact</h2>
            <p>
              Questions about this policy or your data can be sent through the <a href="/contact" className="text-primary hover:underline">contact page</a>.
            </p>
          </section>

        </div>

      </main>

      <MainFooter />
    </div>
  );
}
