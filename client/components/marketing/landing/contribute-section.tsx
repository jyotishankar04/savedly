"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GithubIcon as Github,
  Key01Icon as Key,
  InfinityIcon as Infinity,
  UserGroupIcon as UserGroup,
  ArrowRight01Icon as ArrowRight,
  Bug01Icon as Bug,
  GitPullRequestIcon as PullRequest,
} from "@hugeicons/core-free-icons";
import { GITHUB_CONFIGURED, GITHUB_URL, LICENSE } from "@/lib/open-source";
import { useAuthCta } from "@/hooks/use-auth-cta";

const FREE_HIGHLIGHTS = [
  {
    icon: Github,
    title: `${LICENSE} licensed`,
    body: "Every line is public. Read it, fork it, self-host it — nothing is held back for a paid tier.",
  },
  {
    icon: Key,
    title: "Bring your own AI key",
    body: "Connect OpenAI, Anthropic, Groq, Google, or any OpenAI-compatible endpoint. You pay your provider directly — we never touch that.",
  },
  {
    icon: Infinity,
    title: "No usage limits",
    body: "Every feature, unlimited, on every account. There's no tier to hit a wall on and get asked to upgrade.",
  },
  {
    icon: UserGroup,
    title: "Community supported",
    body: "No investors to please and nothing to sell you — just hosting costs, which contributions like yours help cover.",
  },
];

export function ContributeSection() {
  const cta = useAuthCta();

  return (
    <section id="contribute" className="mx-auto max-w-6xl px-6 py-20 border-t border-border/20">
      <div className="text-center max-w-2xl mx-auto">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
          Contribute
        </span>
        <h2 className="mt-6 text-balance text-center font-medium text-4xl tracking-[-0.04em] sm:text-[2.75rem] text-foreground">
          Help build something that isn&apos;t for sale.
        </h2>
        <p className="mt-4 text-balance text-lg text-muted-foreground tracking-[-0.01em] sm:text-xl">
          This project is free and open source, kept running by the people who use it.
        </p>
      </div>

      {/* 1. What "free" actually means here. */}
      <div className="mt-14">
        <div className="max-w-2xl">
          <h3 className="text-xl font-semibold text-foreground">What free actually means</h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Not a free tier with a paid one waiting behind it — there isn&apos;t a paid one.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {FREE_HIGHLIGHTS.map((item) => (
            <div key={item.title} className="flex items-start gap-3.5 rounded-xl border border-border/50 bg-card p-5">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <HugeiconsIcon icon={item.icon} strokeWidth={2.25} className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">{item.title}</h4>
                <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed">{item.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Link
            href={cta.href}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {cta.isAuthenticated ? "Go to Dashboard" : "Get started free"}
            <HugeiconsIcon icon={ArrowRight} strokeWidth={2.25} className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* 2. Help improve the project itself. */}
      <div className="mt-20 rounded-2xl border border-border/60 bg-muted/20 p-6 md:p-8">
        <h3 className="text-xl font-semibold text-foreground">Help improve the project</h3>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-2xl">
          {GITHUB_CONFIGURED
            ? "The code is public — read it, fix something that bugs you, or build something it's missing. Every contribution, small or large, is welcome."
            : "The code is being prepared for a public repository — check back soon for ways to contribute directly."}
        </p>

        {GITHUB_CONFIGURED && (
          <ol className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { step: "Fork the repo", body: "Fork it to your own GitHub account and clone it locally." },
              { step: "Make your change", body: "Create a branch, fix the bug or build the feature, and commit it." },
              { step: "Open a pull request", body: "Push your branch and open a PR describing what changed and why." },
            ].map((item, i) => (
              <li key={item.step} className="flex items-start gap-2.5">
                <span className="h-5 w-5 rounded-full bg-background border border-border text-foreground text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div>
                  <p className="text-xs font-semibold text-foreground">{item.step}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {GITHUB_CONFIGURED && (
            <>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-90 transition-opacity"
              >
                <HugeiconsIcon icon={Github} strokeWidth={2.25} className="h-4 w-4" />
                View on GitHub
              </a>
              <a
                href={`${GITHUB_URL}/issues`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <HugeiconsIcon icon={PullRequest} strokeWidth={2.25} className="h-4 w-4" />
                Browse open issues
              </a>
            </>
          )}
          <Link
            href="/report"
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <HugeiconsIcon icon={Bug} strokeWidth={2.25} className="h-4 w-4" />
            Report a bug or request a feature
          </Link>
        </div>
      </div>
    </section>
  );
}
