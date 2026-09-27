"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import { SendIcon as Send, SparklesIcon as Sparkles, Calendar01Icon as Calendar } from "@hugeicons/core-free-icons";
import { BOOKING_URL } from "@/lib/booking";

// Adapted from a pasted "ContactSolutionForm" reference. Real fixes:
// @/components/base-ui/* doesn't exist in this repo (real path is
// @/components/ui/*); react-icons swapped for this repo's HugeiconsIcon
// convention. The reference's copy ("Sustainable Futures", "Grow Your
// Green Business") and service list (Carbon Audit, Green Branding — a
// different business entirely) are replaced with this product's own; its
// second contact chip is a phone number, and there's no phone number
// anywhere in this codebase, so that chip is "Response time" (a real fact
// the previous /contact page already stated) instead of an invented one.
// Submission is client-only — the previous /contact page's form never
// called a real endpoint either (just a local `submitted` flag), so this
// keeps that same honest behaviour rather than pretending a backend call
// happens that doesn't.
const SERVICE_OPTIONS = [
  { value: "general", label: "General question" },
  { value: "account", label: "Account" },
  { value: "bug", label: "Something's not working" },
  { value: "feature", label: "Feature request" },
  { value: "other", label: "Something else" },
];

interface ContactFormData {
  fullName: string;
  email: string;
  topic: string;
  message: string;
}

export function ContactFormHero() {
  const [form, setForm] = useState<ContactFormData>({ fullName: "", email: "", topic: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  function handleChange<K extends keyof ContactFormData>(field: K, value: ContactFormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <section className="flex w-full items-center justify-center px-4 py-16">
      <div className="grid w-full max-w-5xl grid-cols-1 items-center gap-12 md:grid-cols-2">
        <div className="flex flex-col gap-6">
          <Badge className="w-fit gap-1.5">
            <HugeiconsIcon icon={Sparkles} strokeWidth={2.25} className="h-3.5 w-3.5" />
            We&rsquo;re here to help
          </Badge>

          <h1 className="text-4xl leading-tight font-extrabold tracking-tight text-foreground sm:text-5xl">
            Get in <span className="block text-primary">touch.</span>
          </h1>

          <p className="max-w-sm text-base leading-relaxed text-muted-foreground">
            Billing, a bug, a feature you wish existed — tell us. A real person reads
            every message.
          </p>

          <Separator className="my-2 w-16 border-primary/40" />

          <a
            href={BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex w-fit items-center gap-2 rounded-full border border-primary/40 bg-primary/5 px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            <HugeiconsIcon icon={Calendar} strokeWidth={2.25} className="h-4 w-4" />
            Book a 30-min call
          </a>
        </div>

        <Card className="rounded-4xl bg-muted shadow-sm ring-0">
          <CardContent className="flex flex-col gap-5 p-8">
            {submitted ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 shadow-xs">
                  ✓
                </div>
                <h3 className="text-base font-bold text-foreground">Message sent!</h3>
                <p className="max-w-xs text-xs text-muted-foreground">
                  Thanks for reaching out{form.fullName ? `, ${form.fullName}` : ""}. We&rsquo;ll get back to you within a day.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-0.5">
                  <Label htmlFor="fullName" className="text-sm font-medium text-foreground">
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    placeholder="Your name"
                    value={form.fullName}
                    onChange={(e) => handleChange("fullName", e.target.value)}
                    required
                    className="rounded-xl border-0 bg-input text-sm shadow-[inset_0_1px_0_0_rgba(255,255,255,1)] focus-visible:ring-1 focus-visible:ring-primary dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]"
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    required
                    className="rounded-xl border-0 bg-input text-sm shadow-[inset_0_1px_0_0_rgba(255,255,255,1)] focus-visible:ring-1 focus-visible:ring-primary dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]"
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <Label htmlFor="topic" className="text-sm font-medium text-foreground">
                    What&rsquo;s this about?
                  </Label>
                  <Select items={SERVICE_OPTIONS} value={form.topic} onValueChange={(val) => handleChange("topic", val as string)}>
                    <SelectTrigger
                      id="topic"
                      className="rounded-xl border-0 bg-input text-sm text-muted-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,1)] focus:ring-1 focus:ring-primary dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]"
                    >
                      <SelectValue placeholder="Choose one…" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {SERVICE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-sm">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-0.5">
                  <Label htmlFor="message" className="text-sm font-medium text-foreground">
                    Message
                  </Label>
                  <Textarea
                    id="message"
                    placeholder="How can we help?"
                    rows={4}
                    value={form.message}
                    onChange={(e) => handleChange("message", e.target.value)}
                    required
                    className="resize-none rounded-xl border-0 bg-input text-sm shadow-[inset_0_1px_0_0_rgba(255,255,255,1)] focus-visible:ring-1 focus-visible:ring-primary dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]"
                  />
                </div>

                <Button
                  type="submit"
                  className="group mt-1 w-full gap-2 rounded-xl bg-primary py-5 text-sm font-semibold text-primary-foreground shadow-[inset_0_2px_0_0_rgba(255,255,255,0.5),inset_0_-2px_0_0_rgba(0,0,0,0.2)] transition-all hover:bg-primary/90 dark:shadow-[inset_0_2px_0_0_rgba(255,255,255,0.2)]"
                >
                  Send message
                  <HugeiconsIcon icon={Send} strokeWidth={2.25} className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export default ContactFormHero;
