"use client";

import React, { useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { SentIcon as Send, CircleCheckIcon as CheckCircle, ArrowLeft01Icon as ArrowLeft } from "@hugeicons/core-free-icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { toast } from "@/components/ui/toast";
import { Logo } from "@/components/logo";
import { submitWaitlist } from "@/lib/waitlist";

// Fixed, not Math.random() at render time — a client-only random seed would
// render differently on the server than the client and trip a hydration
// mismatch warning.
const STARS = Array.from({ length: 90 }, (_, i) => {
  const seed = (i * 137.5) % 100; // golden-angle spread, evenly covers the field without an obvious grid
  return {
    x: (seed * 3.7) % 100,
    y: (seed * 5.3 + i * 2.1) % 100,
    size: i % 5 === 0 ? 2 : 1,
    opacity: 0.15 + ((i * 31) % 60) / 100,
  };
});

export function WaitlistLanding() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSubmitting(true);
    try {
      const ok = await submitWaitlist({
        email: email.trim(),
        _subject: "New Savedly waitlist signup",
      });
      if (!ok) throw new Error("Request not accepted");

      setSubmitted(true);
      toast.add({ title: "You're on the list!", type: "success" });
    } catch {
      toast.add({ title: "Something went wrong. Please try again.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background text-foreground flex flex-col items-center justify-center px-6">
      {/* Starfield — subtle in both themes since it's tinted with the foreground color, not a fixed white */}
      <div aria-hidden className="absolute inset-0">
        {STARS.map((star, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-foreground"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
            }}
          />
        ))}
      </div>

      {/* Bottom horizon glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-[40%] left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/30 blur-[120px] dark:bg-primary/40"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 h-32 w-full bg-gradient-to-t from-background to-transparent"
      />

      <Link
        href="/"
        className="absolute left-6 top-6 z-10 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <HugeiconsIcon icon={ArrowLeft} strokeWidth={2.25} className="h-3.5 w-3.5" />
        Back to home
      </Link>

      <div className="relative z-10 flex flex-col items-center text-center gap-8 max-w-xl">
        <Logo className="text-lg text-foreground" />

        <div className="space-y-5">
          <Badge variant="secondary" className="rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em]">
            Savedly
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight leading-[1.15]">
            The wait is part
            <br />
            of the <span className="font-serif italic font-normal">journey</span>.
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
            We&apos;re still building. Leave your email and we&apos;ll notify you the moment Savedly is ready.
          </p>
        </div>

        {submitted ? (
          <div className="flex items-center justify-center gap-2 text-sm font-semibold text-foreground">
            <HugeiconsIcon icon={CheckCircle} strokeWidth={2.25} className="h-5 w-5 text-primary" />
            Thanks — we&apos;ll be in touch.
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row items-center justify-center gap-2.5 w-full max-w-md"
          >
            <Label htmlFor="waitlist-email" className="sr-only">
              Email address
            </Label>
            <Input
              id="waitlist-email"
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 w-full rounded-full px-4 text-sm"
            />
            <MagneticButton strength={0.4} className="shrink-0 w-full sm:w-auto">
              <Button
                type="submit"
                size="lg"
                disabled={submitting}
                className="h-11 w-full rounded-full px-6 text-sm font-semibold flex items-center justify-center gap-1.5"
              >
                {submitting ? "Sending..." : "Get Notified"}
                {!submitting && <HugeiconsIcon icon={Send} strokeWidth={2.25} className="h-4 w-4" />}
              </Button>
            </MagneticButton>
          </form>
        )}
      </div>
    </div>
  );
}
