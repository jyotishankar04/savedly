"use client";

import React from "react";
import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Shield01Icon as Shield, LockKeyIcon as Lock, BrainIcon as Brain, GitBranchIcon as Git } from "@hugeicons/core-free-icons";

export default function SecurityPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-primary/[0.03] via-background to-background text-foreground font-sans">
      <Navbar />

      <main className="flex-1 pt-32 pb-20 max-w-4xl mx-auto px-6">

        {/* Header */}
        <div className="text-center space-y-4 mb-16">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
            Trust Center
          </span>
          <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-foreground leading-[1.15]">
            Security & Privacy
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Your second brain holds your most important thoughts. We treat it with the highest level of cryptographic and architectural security.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="p-6 border rounded-2xl bg-card">
            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <HugeiconsIcon icon={Lock} className="text-primary h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Encrypted at Rest</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              All memories, documents, and vector embeddings are encrypted at rest using industry-standard AES-256 encryption. We enforce HTTPS (TLS 1.2+) for all data in transit.
            </p>
          </div>
          <div className="p-6 border rounded-2xl bg-card">
            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <HugeiconsIcon icon={Brain} className="text-primary h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Zero AI Retention</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We exclusively use zero-retention enterprise API endpoints. Your data is <strong>never</strong> used by OpenAI, Anthropic, or any other provider to train their models.
            </p>
          </div>
          <div className="p-6 border rounded-2xl bg-card">
            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <HugeiconsIcon icon={Git} className="text-primary h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Open Source Trust</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Security through transparency. Our core engine is open-source under the AGPL-3.0 license, allowing security researchers and the community to audit our architecture.
            </p>
          </div>
          <div className="p-6 border rounded-2xl bg-card">
            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <HugeiconsIcon icon={Shield} className="text-primary h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Total Air-Gap (Self-Host)</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If cloud storage isn&apost an option, you can self-host the entire SaveForLatter stack on your own infrastructure, ensuring your data never leaves your private network.
            </p>
          </div>
        </div>

        {/* Content text */}
        <div className="prose prose-zinc dark:prose-invert max-w-none text-sm md:text-base leading-relaxed text-foreground/80 space-y-8 border-t pt-12">

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Infrastructure Security</h2>
            <p>
              SaveForLatter is hosted on world-class infrastructure providers that maintain strict SOC 2 Type II, ISO 27001, and HIPAA compliance.
              Our database clusters are logically isolated, and access to production environments is strictly limited to authorized core personnel using
              hardware-backed multi-factor authentication (MFA).
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Vector Privacy & Embeddings</h2>
            <p>
              When you save a link or note, SaveForLatter generates a mathematical representation (a vector embedding) of the text to enable semantic search.
              These vectors are generated via secure API boundaries.
              <strong> The vectors themselves are purely mathematical arrays and cannot be reverse-engineered back into your original text by external parties. </strong>
              Furthermore, all vector search databases are strictly siloed per-user.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Authentication & Access</h2>
            <p>
              We offload credential management to highly secure, battle-tested identity providers (like Google, Apple, and GitHub OAuth).
              If you choose email authentication, passwords are not stored in plaintext; they are securely hashed and salted using robust algorithms (e.g., bcrypt).
            </p>
          </section>

          <section className="space-y-4 pt-8 border-t border-border">
            <h2 className="text-xl font-bold text-foreground">Reporting Vulnerabilities</h2>
            <p>
              We take the security of our platform and our users&apos data very seriously. If you are a security researcher and have discovered a vulnerability,
              please <Link href="/contact" className="text-primary hover:underline">contact us</Link> immediately. We request that you provide us with a reasonable timeframe to address the issue before public disclosure.
            </p>
          </section>

        </div>
      </main>

      <MainFooter />
    </div>
  );
}
