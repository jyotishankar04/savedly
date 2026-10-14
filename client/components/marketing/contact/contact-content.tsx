"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { motion, MotionConfig, type Variants } from "motion/react";
import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";
import { ContactSection } from "@/components/arc/blocks/contact-section/contact-section";
import { CopyButton } from "@/components/arc/copy-button/copy-button";
import { BOOKING_URL } from "@/lib/booking";
import { GITHUB_URL } from "@/lib/open-source";
import { CONTACT_TOPICS, SUPPORT_EMAIL, sendContactMessage } from "@/lib/contact";

gsap.registerPlugin(useGSAP, SplitText);

// The contact page, in the About page's manner: one large line that rises in
// (GSAP), then Arc's contact form, which really sends (server/src/modules/
// contact emails the support inbox, Reply-To the person who wrote), then the
// other ways in, which appear one after another (Motion). One font
// throughout. No reply-time promise and no phone number: neither exists.

const EASE = [0.16, 1, 0.3, 1] as const;
const rise: Variants = { hidden: { opacity: 0, y: 18 }, shown: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } } };

const OTHER_WAYS: { label: string; detail: string; action: string; href: string; external?: boolean }[] = [
  { label: "Talk it through", detail: "A 30-minute call, at a time that suits you", action: "Book", href: BOOKING_URL, external: true },
  { label: "Report a bug", detail: "With the steps that led to it, so it can be fixed", action: "Report", href: "/report" },
  { label: "Look it up", detail: "Guides to every feature, and a box to ask in", action: "Help Center", href: "/help" },
  { label: "Open an issue", detail: "In public, on the code itself", action: "GitHub", href: `${GITHUB_URL}/issues`, external: true },
];

/** The time in Bhubaneswar, filled in after the page loads so the server and browser agree on the first render. */
function LocalTime() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const format = () => setTime(new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" }).format(new Date()));
    format();
    const timer = window.setInterval(format, 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return time ? <>, where it&apos;s {time} now</> : null;
}

export function ContactContent() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const hero = root.current!.querySelector<HTMLElement>("[data-hero]")!;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(hero, { autoAlpha: 1 });
      });
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(hero, { autoAlpha: 1 });
        SplitText.create(hero.querySelector("h1"), {
          type: "words,lines",
          mask: "lines",
          autoSplit: true,
          onSplit: (self) =>
            gsap
              .timeline()
              .from(self.words, { yPercent: 110, duration: 1.1, ease: "expo.out", stagger: 0.08 })
              .from(hero.querySelector("p"), { autoAlpha: 0, y: 14, duration: 0.9, ease: "power3.out" }, "-=0.6")
              .from("[data-form]", { autoAlpha: 0, y: 40, duration: 1, ease: "power3.out" }, "-=0.7"),
        });
      });
    },
    { scope: root },
  );

  return (
    <MotionConfig reducedMotion="user">
      <div ref={root} className="flex min-h-screen flex-col bg-background font-sans text-foreground antialiased">
        <Navbar />

        <main className="flex-1">
          <noscript>
            <style>{"[data-hero]{visibility:visible!important}"}</style>
          </noscript>
          <header data-hero className="invisible px-5 pt-40 pb-6 text-center sm:px-8 md:pt-48">
            <h1 className="text-[clamp(2.75rem,7vw,5rem)] font-medium leading-[1.02] tracking-[-0.045em] text-balance text-foreground">Talk to a person</h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground sm:text-xl">
              A question, a bug, billing, or an idea. Every message is read by someone who works on Savedly.
            </p>
          </header>

          <div data-form>
            <ContactSection
              title="Write to us"
              description="Say what happened and where. A link, or the steps that led to a problem, lets us look straight away."
              email={SUPPORT_EMAIL}
              topics={CONTACT_TOPICS}
              onSubmit={sendContactMessage}
            />
          </div>

          <section className="px-5 pt-8 pb-24 sm:px-8 md:pb-32">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-center text-[clamp(1.75rem,3.6vw,2.5rem)] font-medium leading-[1.1] tracking-[-0.035em] text-balance text-foreground">Or another way</h2>

              <motion.ul
                variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.07 } } }}
                initial="hidden"
                whileInView="shown"
                viewport={{ once: true, margin: "-10% 0px" }}
                className="mt-10 divide-y divide-foreground/10 border-y border-foreground/10"
              >
                {OTHER_WAYS.map((way) => (
                  <motion.li key={way.label} variants={rise}>
                    <motion.a
                      href={way.href}
                      {...(way.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      whileHover={{ x: 4 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      className="group flex items-center justify-between gap-6 py-5"
                    >
                      <span className="min-w-0">
                        <span className="block text-base font-medium text-foreground">{way.label}</span>
                        <span className="mt-0.5 block text-sm text-muted-foreground">{way.detail}</span>
                      </span>
                      <span className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-foreground ring-1 ring-foreground/15 transition-colors group-hover:bg-foreground group-hover:text-background">
                        {way.action}
                      </span>
                    </motion.a>
                  </motion.li>
                ))}
                <motion.li variants={rise} className="flex items-center justify-between gap-6 py-5">
                  <span className="min-w-0">
                    <span className="block text-base font-medium text-foreground">Email us yourself</span>
                    <span className="mt-0.5 block truncate text-sm text-muted-foreground">{SUPPORT_EMAIL}</span>
                  </span>
                  <CopyButton value={SUPPORT_EMAIL} label="Copy address" />
                </motion.li>
              </motion.ul>

              <p className="mt-10 text-center text-sm text-muted-foreground">
                Savedly is made in Bhubaneswar, India
                <LocalTime />. Read{" "}
                <Link href="/about" className="text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground">
                  why it exists
                </Link>
                .
              </p>
            </div>
          </section>
        </main>

        <MainFooter />
      </div>
    </MotionConfig>
  );
}
