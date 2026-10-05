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
import { DonatePanel } from "@/components/marketing/landing/donate-panel";

const FREE_HIGHLIGHTS = [
  {
    icon: Github,
    title: `${LICENSE} licensed`,
    body: "Every line is public. Read it, fork it, or self-host it with every feature unlocked.",
  },
  {
    icon: Key,
    title: "Your AI, your way",
    body: "On the hosted version we supply the AI. Self-host it and connect OpenAI, Anthropic, Groq, Google, or any OpenAI-compatible endpoint instead, with no limits.",
  },
  {
    icon: Infinity,
    title: "Self-host with no limits",
    body: "Run it on your own server with one command and everything is unlimited. On the hosted version, the Free plan covers the essentials.",
  },
  {
    icon: UserGroup,
    title: "Community supported",
    body: "No investors to please. Subscriptions and contributions like yours cover the servers and the AI we supply.",
  },
];

/** `showDonate` adds the Buy Me a Coffee panel; only the /contribute page passes it. */
export function ContributeSection({ showDonate = false }: { showDonate?: boolean }) {
  const cta = useAuthCta();

  return (
    <section id="contribute" className="bg-background px-5 py-16 sm:px-6 md:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="max-w-md">
            <h2 className="text-3xl leading-[1.08] font-semibold tracking-[-0.03em] text-balance text-foreground sm:text-[2.75rem]">
              Open source, and yours to run.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-pretty text-muted-foreground">
              Your memories should belong to you. SaveForLatter is open source, so you can see how it works, run it yourself, and keep
              control of your data.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              {GITHUB_CONFIGURED ? (
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-[15px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  View on GitHub
                  <HugeiconsIcon icon={ArrowRight} strokeWidth={2} className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </a>
              ) : (
                <Link
                  href={cta.href}
                  className="group inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-[15px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {cta.isAuthenticated ? "Go to Dashboard" : "Get started free"}
                  <HugeiconsIcon icon={ArrowRight} strokeWidth={2} className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              )}
              <Link href="/pricing" className="text-[15px] font-medium text-foreground underline-offset-4 hover:underline">
                See pricing
              </Link>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">Self-host it · Read the code · Contribute</p>
          </div>

          {/* What free actually means: a spec list, not a card grid. */}
          <dl className="grid gap-x-10 border-t border-foreground/10 sm:grid-cols-2">
            {FREE_HIGHLIGHTS.map((item) => (
              <div key={item.title} className="border-b border-foreground/10 py-6">
                <dt className="flex items-center gap-2.5 font-medium text-foreground">
                  <HugeiconsIcon icon={item.icon} strokeWidth={2} className="h-[18px] w-[18px] text-primary" />
                  {item.title}
                </dt>
                <dd className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{item.body}</dd>
              </div>
            ))}
          </dl>
        </div>

        {showDonate && <DonatePanel />}

        {/* Help improve the project itself. */}
        <div className="mt-20 grid gap-10 rounded-3xl bg-foreground/[0.035] p-7 ring-1 ring-foreground/8 sm:p-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:p-12">
          <div>
            <h3 className="text-2xl font-semibold tracking-[-0.02em] text-foreground">Help improve the project</h3>
            <p className="mt-3 max-w-md leading-relaxed text-muted-foreground">
              {GITHUB_CONFIGURED
                ? "The code is public. Read it, fix something that bugs you, or build something it's missing. Every contribution, small or large, is welcome."
                : "The code is being prepared for a public repository. Check back soon for ways to contribute directly."}
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              {GITHUB_CONFIGURED && (
                <>
                  <a
                    href={GITHUB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center gap-1.5 rounded-full bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90"
                  >
                    <HugeiconsIcon icon={Github} strokeWidth={2} className="h-4 w-4" />
                    View on GitHub
                  </a>
                  <a
                    href={`${GITHUB_URL}/issues`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center gap-1.5 rounded-full px-5 text-sm font-medium text-foreground ring-1 ring-foreground/15 transition-colors hover:bg-foreground/5"
                  >
                    <HugeiconsIcon icon={PullRequest} strokeWidth={2} className="h-4 w-4" />
                    Browse open issues
                  </a>
                </>
              )}
              <Link
                href="/report"
                className="inline-flex h-10 items-center gap-1.5 rounded-full px-5 text-sm font-medium text-foreground ring-1 ring-foreground/15 transition-colors hover:bg-foreground/5"
              >
                <HugeiconsIcon icon={Bug} strokeWidth={2} className="h-4 w-4" />
                Report a bug or request a feature
              </Link>
            </div>
          </div>

          {GITHUB_CONFIGURED && (
            <ol className="space-y-5 self-center">
              {[
                { step: "Fork the repo", body: "Fork it to your own GitHub account and clone it locally." },
                { step: "Make your change", body: "Create a branch, fix the bug or build the feature, and commit it." },
                { step: "Open a pull request", body: "Push your branch and open a PR describing what changed and why." },
              ].map((item, i) => (
                <li key={item.step} className="flex gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background font-mono text-xs text-foreground ring-1 ring-foreground/15">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium text-foreground">{item.step}</p>
                    <p className="mt-0.5 text-[15px] text-muted-foreground">{item.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}
