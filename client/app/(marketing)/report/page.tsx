"use client";

import { useState, type FormEvent } from "react";
import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";
import { HugeiconsIcon } from "@hugeicons/react";
import { BugIcon as Bug, Idea01Icon as Lightbulb, SentIcon as Send } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { submitReport, type ReportType } from "@/lib/reports";
import { ApiError } from "@/lib/auth";

// A real, working endpoint (POST /api/v1/reports, server/src/modules/
// report/) — not another client-only form. "Helps improve the app" only
// means something if a report actually lands somewhere; the previous
// /contact form (and this one, for the same reason) can't back that up on
// its own, so this one gets a real table (schema.ts's `reports`) and a
// real insert behind it. No admin UI reads them yet — they're reviewable
// directly via drizzle-kit studio (`npx drizzle-kit studio` from server/)
// until one exists.
const TYPES: { value: ReportType; label: string; icon: typeof Bug; hint: string }[] = [
  { value: "bug", label: "Report a bug", icon: Bug, hint: "Something broke, or didn't do what it should have." },
  { value: "feature", label: "Request a feature", icon: Lightbulb, hint: "Something that doesn't exist yet, but should." },
];

export default function ReportPage() {
  const [type, setType] = useState<ReportType>("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);
    try {
      await submitReport({
        type,
        title,
        description,
        email: email.trim() || undefined,
        pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
      });
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-primary/[0.03] via-background to-background font-sans text-foreground">
      <Navbar />

      <main className="flex-1 px-6 pt-32 pb-24">
        <div className="mx-auto max-w-xl">
          <div className="mb-10 space-y-3 text-center">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wider text-primary uppercase">
              Help us build it right
            </span>
            <h1 className="text-4xl leading-[1.15] font-medium tracking-tight text-foreground md:text-5xl">
              Found a bug? Missing something?
            </h1>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
              Every report here goes straight into our tracker — the same one the
              team actually works from.
            </p>
          </div>

          {status === "done" ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">✓</div>
              <h2 className="text-base font-semibold text-foreground">Thanks — that&apos;s in the tracker.</h2>
              <p className="mx-auto mt-2 max-w-xs text-xs text-muted-foreground">
                {type === "bug" ? "We'll look into it." : "We'll consider it for a future release."}
                {email ? " We'll follow up at the email you gave us if there's anything to share." : ""}
              </p>
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => {
                  setStatus("idle");
                  setTitle("");
                  setDescription("");
                  setEmail("");
                }}
              >
                Submit another
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-border bg-card p-6 md:p-8">
              <div className="grid grid-cols-2 gap-3">
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={cn(
                      "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors",
                      type === t.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                    )}
                  >
                    <HugeiconsIcon
                      icon={t.icon}
                      strokeWidth={2.25}
                      className={cn("h-5 w-5", type === t.value ? "text-primary" : "text-muted-foreground")}
                    />
                    <span className="text-sm font-semibold text-foreground">{t.label}</span>
                    <span className="text-xs leading-snug text-muted-foreground">{t.hint}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="title">{type === "bug" ? "What went wrong?" : "What do you want to be able to do?"}</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={type === "bug" ? "e.g. Vault won't unlock after switching tabs" : "e.g. Export a collection as PDF"}
                  required
                  maxLength={200}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Details</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    type === "bug"
                      ? "What did you expect to happen? What actually happened? Steps to reproduce help a lot."
                      : "What would this let you do that you can't today?"
                  }
                  rows={5}
                  required
                  maxLength={5000}
                  className="resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com — only if you want a reply"
                />
              </div>

              {status === "error" && errorMessage && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{errorMessage}</p>
              )}

              <Button type="submit" disabled={status === "submitting"} className="group w-full gap-2">
                {status === "submitting" ? "Sending…" : "Submit"}
                {status !== "submitting" && <HugeiconsIcon icon={Send} strokeWidth={2.25} className="h-3.5 w-3.5" />}
              </Button>
            </form>
          )}
        </div>
      </main>

      <MainFooter />
    </div>
  );
}
