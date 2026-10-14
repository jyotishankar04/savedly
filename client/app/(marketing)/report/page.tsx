"use client";

import { useState, type FormEvent } from "react";
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon as ArrowUpRight, Tick02Icon as Tick } from "@hugeicons/core-free-icons";
import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";
import { HeroReveal } from "@/components/marketing/motion/hero-reveal";
import { RevealList } from "@/components/marketing/motion/reveal";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { Input } from "@/components/arc/input/input";
import { Textarea } from "@/components/arc/textarea/textarea";
import { Button } from "@/components/arc/button/button";
import { submitReport, type ReportType } from "@/lib/reports";
import { ApiError } from "@/lib/auth";
import { GITHUB_URL } from "@/lib/open-source";

// Report a bug or suggest a feature. It posts to POST /api/v1/reports
// (server/src/modules/report), which saves the report and emails it to the
// team's inbox, Reply-To the reporter when they leave an address. The page
// follows Contact's manner: one font, the headline rising in (GSAP), Arc's
// segmented control, fields and button, and a thank-you that replaces the
// form in place (Motion).

const EASE = [0.16, 1, 0.3, 1] as const;

const COPY: Record<ReportType, { title: string; titlePlaceholder: string; details: string; detailsPlaceholder: string }> = {
  bug: {
    title: "What went wrong?",
    titlePlaceholder: "The vault won't unlock after switching tabs",
    details: "Details",
    detailsPlaceholder: "What did you expect, and what happened instead? The steps that lead to it help most.",
  },
  feature: {
    title: "What would you like to do?",
    titlePlaceholder: "Export a collection as a PDF",
    details: "Why it would help",
    detailsPlaceholder: "What would this let you do that you can't today?",
  },
};

const NEXT_STEPS = [
  { title: "It's saved", body: "Every report is kept, with the page you sent it from." },
  { title: "Someone reads it", body: "It's emailed straight to the people who build Savedly." },
  { title: "You hear back", body: "If you leave an email, a reply comes there. Leave it out and you stay anonymous." },
];

export default function ReportPage() {
  const reduced = useReducedMotion();
  const [type, setType] = useState<ReportType>("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const copy = COPY[type];

  const fieldErrors = {
    title: !title.trim() ? (type === "bug" ? "Say what went wrong, in a line" : "Say what you'd like to do, in a line") : undefined,
    description: description.trim().length < 10 ? "Add a little more, so we can act on it" : undefined,
    email: email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? "Enter an email like name@example.com, or leave it empty" : undefined,
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (fieldErrors.title || fieldErrors.description || fieldErrors.email) return;
    setStatus("submitting");
    setError(null);
    try {
      await submitReport({ type, title: title.trim(), description: description.trim(), email: email.trim() || undefined, pageUrl: window.location.href });
      setStatus("done");
    } catch (err) {
      setStatus("idle");
      setError(err instanceof ApiError ? err.message : "That didn't send. Check your connection and try again.");
    }
  }

  function reset() {
    setTitle("");
    setDescription("");
    setTried(false);
    setStatus("idle");
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-screen flex-col bg-background font-sans text-foreground antialiased">
        <Navbar />

        <main className="flex-1 px-5 pt-36 pb-24 sm:px-8 md:pt-44 md:pb-32">
          {/* Headline, then the form, then what happens next: on a phone in that order; side by side, the form takes the right column. */}
          <div className="mx-auto grid max-w-6xl gap-x-20 gap-y-12 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="lg:col-start-1 lg:row-start-1">
              <HeroReveal as="div">
                <h1 className="text-[clamp(2.25rem,4.4vw,3.25rem)] font-medium leading-[1.05] tracking-[-0.045em] text-balance text-foreground">Something broken? Something missing?</h1>
                <p className="mt-6 max-w-md text-lg leading-relaxed text-pretty text-muted-foreground">
                  Tell us here. It takes a minute, and it&apos;s how most of what&apos;s on the changelog started.
                </p>
              </HeroReveal>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.45 }}
              className="self-start rounded-[2rem] bg-muted/50 p-6 ring-1 ring-foreground/[0.06] sm:p-8 lg:col-start-2 lg:row-span-2 lg:row-start-1"
            >
              <AnimatePresence mode="wait" initial={false}>
                {status === "done" ? (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, y: reduced ? 0 : 12, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="flex flex-col items-center py-10 text-center"
                    aria-live="polite"
                  >
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground">
                      <HugeiconsIcon icon={Tick} strokeWidth={2.5} className="h-6 w-6" />
                    </span>
                    <h2 className="mt-5 text-2xl font-medium tracking-[-0.03em] text-foreground">Thanks, that reached us</h2>
                    <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
                      {type === "bug" ? "We'll look into it." : "We'll weigh it up for what comes next."}
                      {email.trim() ? ` If there's anything to share, we'll write to ${email.trim()}.` : ""}
                    </p>
                    <div className="mt-7">
                      <Button variant="secondary" onClick={reset}>
                        Send another
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.form key="form" onSubmit={handleSubmit} noValidate exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex flex-col gap-6" aria-label="Report form">
                    <SegmentedControl
                      label="What kind of report"
                      options={[
                        { value: "bug", label: "A bug" },
                        { value: "feature", label: "An idea" },
                      ]}
                      value={type}
                      onValueChange={(v) => setType(v as ReportType)}
                    />
                    <Input
                      label={copy.title}
                      name="title"
                      placeholder={copy.titlePlaceholder}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={200}
                      error={tried ? fieldErrors.title : undefined}
                      readOnly={status === "submitting"}
                    />
                    <Textarea
                      label={copy.details}
                      name="description"
                      placeholder={copy.detailsPlaceholder}
                      rows={6}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={5000}
                      error={tried ? fieldErrors.description : undefined}
                      readOnly={status === "submitting"}
                    />
                    <Input
                      label="Email (optional)"
                      name="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      description="Only if you'd like a reply."
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      error={tried ? fieldErrors.email : undefined}
                      readOnly={status === "submitting"}
                    />
                    {error && (
                      <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {error}
                      </p>
                    )}
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm text-muted-foreground">The page you&apos;re on is sent with it.</p>
                      <Button type="submit" variant="primary" loading={status === "submitting"}>
                        Send
                      </Button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </motion.div>

            <div className="lg:col-start-1 lg:row-start-2">
              <RevealList as="ol" className="border-t border-foreground/10" gap={0.1}>
                {NEXT_STEPS.map((step, i) => (
                  <div key={step.title} className="flex gap-4 border-b border-foreground/10 py-5">
                    <span className="mt-0.5 text-sm text-muted-foreground tabular-nums">0{i + 1}</span>
                    <div>
                      <p className="text-base font-medium text-foreground">{step.title}</p>
                      <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">{step.body}</p>
                    </div>
                  </div>
                ))}
              </RevealList>

              <p className="mt-8 text-sm text-muted-foreground">
                Rather discuss it in public?{" "}
                <a href={`${GITHUB_URL}/issues/new`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground">
                  Open a GitHub issue
                  <HugeiconsIcon icon={ArrowUpRight} strokeWidth={2} className="h-3.5 w-3.5" />
                </a>
              </p>
            </div>
          </div>
        </main>

        <MainFooter />
      </div>
    </MotionConfig>
  );
}
