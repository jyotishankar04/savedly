"use client";

import React from "react";
import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";
import { HugeiconsIcon } from "@hugeicons/react";
import { Shield01Icon as Shield, LockKeyIcon as Lock, BrainIcon as Brain, GitBranchIcon as Git } from "@hugeicons/core-free-icons";
import { SELF_HOSTED } from "@/lib/instance";
import { HostedPolicyNotice } from "@/components/self-hosted/plain-chrome";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/contact";

export default function SecurityPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-primary/[0.03] via-background to-background text-foreground font-sans">
      <Navbar />

      <main className="flex-1 pt-32 pb-20 max-w-4xl mx-auto px-6">

        {SELF_HOSTED && <HostedPolicyNotice />}

        {/* Header */}
        <div className="text-center space-y-4 mb-16">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
            Trust Center
          </span>
          <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-foreground leading-[1.15]">
            Security & Privacy
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            What you save is personal. This page says plainly how it is protected, and where the limits are.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="p-6 border rounded-2xl bg-card">
            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <HugeiconsIcon icon={Lock} className="text-primary h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Encrypted in transit, secrets encrypted at rest</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Everything between your browser and our servers travels over HTTPS. The most sensitive things we hold for you, such as AI provider keys and calendar tokens, are encrypted with AES-256-GCM before they are stored.
            </p>
          </div>
          <div className="p-6 border rounded-2xl bg-card">
            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <HugeiconsIcon icon={Brain} className="text-primary h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Never used for training</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              When something needs AI, only the relevant content is sent to the AI provider, and the result is written back to your account. We <strong>don&apos;t</strong> use what you save to train any model, ours or anyone else&apos;s.
            </p>
          </div>
          <div className="p-6 border rounded-2xl bg-card">
            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <HugeiconsIcon icon={Git} className="text-primary h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Open Source Trust</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The whole product is open source under the AGPL-3.0 license, so anyone can read exactly how your data is handled and check it against what we say here.
            </p>
          </div>
          <div className="p-6 border rounded-2xl bg-card">
            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <HugeiconsIcon icon={Shield} className="text-primary h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Run it yourself</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You can self-host Savedly on your own server. Your data then stays in your database and storage, and AI requests go only to the provider you choose.
            </p>
          </div>
        </div>

        {/* Content text */}
        <div className="prose prose-zinc dark:prose-invert max-w-none text-sm md:text-base leading-relaxed text-foreground/80 space-y-8 border-t pt-12">

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Where your data lives</h2>
            <p>
              On the hosted service, your account and saved items are kept in a managed PostgreSQL database, uploaded files in Cloudflare R2, and search vectors in a managed vector index. Every record is tied to your account, and every request is checked against it, so one person can&apos;t read another&apos;s library.
            </p>
            <p>
              Savedly is a small, independent project. We don&apos;t hold security certifications such as SOC 2 or ISO 27001, and we won&apos;t claim otherwise.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Sign-in and sessions</h2>
            <p>
              You sign in with Google or GitHub, so we never see or store that password. Your session is held in cookies that scripts on the page can&apos;t read. On a self-hosted install that uses email and password, passwords are hashed with scrypt and never stored in plain text.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">The vault</h2>
            <p>
              Items in the vault are hidden behind a PIN, which is hashed with scrypt and checked on the server. This is access control, not end-to-end encryption: the content itself is stored like the rest of your library.
            </p>
          </section>

          <section className="space-y-4 pt-8 border-t border-border">
            <h2 className="text-xl font-bold text-foreground">Reporting Vulnerabilities</h2>
            <p>
              If you find a vulnerability, please report it privately through{" "}
              <a href="https://github.com/jyotishankar04/saveforlatter/security/advisories/new" target="_blank" rel="noreferrer" className="text-primary hover:underline">GitHub&apos;s private vulnerability reporting</a>{" "}
              or by email to <a href={SUPPORT_MAILTO} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>, not in a public issue. Give us a reasonable time to fix it before you disclose it.
            </p>
          </section>

        </div>
      </main>

      <MainFooter />
    </div>
  );
}
