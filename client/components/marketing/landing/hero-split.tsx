"use client";

import Image from "next/image";
import Link from "next/link";
import bgDark from "@/public/hero-bg-dark.webp";
import bgLight from "@/public/hero-bg-light.webp";
import { Logo } from "@/components/logo";
import { motion, type Variants } from "motion/react";
import { ArrowRight, Layers, MessageSquareQuote, SearchCheck } from "lucide-react";
import { ctaHref, SHOWCASE_MODE } from "@/lib/showcase";
import { useAuthCta } from "@/hooks/use-auth-cta";

const NAV_LINKS = [
  { label: "Features", href: "/features" },
  { label: "Contribute", href: "/contribute" },
  { label: "Changelog", href: "/changelog" },
  { label: "Blog", href: "/blog" },
] as const;

// The same three claims the other hero makes, in the row that the reference
// layout puts along the bottom edge.
const CAPABILITIES = [
  { icon: Layers, title: "Six formats in", body: "Links, videos, notes, images, documents, voice." },
  { icon: SearchCheck, title: "Hybrid search", body: "Meaning and keywords, ranked together." },
  { icon: MessageSquareQuote, title: "Cited answers", body: "Every reply links back to the memory." },
] as const;

const navVariants: Variants = {
  hidden: { opacity: 0, y: -18, filter: "blur(6px)" },
  show: {
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { type: "spring", damping: 22, stiffness: 150, delay: 0.1 },
  },
};

const copyContainerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.35 } },
};

const copyItemVariants: Variants = {
  hidden: { opacity: 0, y: 20, filter: "blur(6px)" },
  show: {
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { type: "spring", damping: 24, stiffness: 105, mass: 0.95 },
  },
};

// The art panel arrives after the copy has settled, sliding in from the edge
// it bleeds off — so the eye lands on the headline first, not the picture.
const artVariants: Variants = {
  hidden: { opacity: 0, x: 48, filter: "blur(10px)" },
  show: {
    opacity: 1, x: 0, filter: "blur(0px)",
    transition: { type: "spring", damping: 28, stiffness: 80, mass: 1.2, delay: 0.5 },
  },
};

const capabilitiesVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring", damping: 26, stiffness: 120, delay: 1.1 } },
};

/**
 * Hero B — split layout: copy on a plain ground at the left, the art in a
 * panel that bleeds off the right edge. Everything is drawn from the theme
 * tokens rather than hard-coded black/white, so the calm light version and
 * the dark version are the same design, not two of them.
 */
export default function HeroSplit() {
  const cta = useAuthCta();

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-background font-sans text-foreground antialiased">
      <motion.header
        variants={navVariants}
        initial="hidden"
        animate="show"
        className="mx-auto flex w-full max-w-[1800px] items-center justify-between gap-6 px-6 py-6 md:px-12"
      >
        <Link href="/" className="flex items-center gap-2">
          <Logo className="text-xl" />
        </Link>

        <nav className="hidden items-center gap-9 text-[14px] font-medium text-muted-foreground lg:flex">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="flex min-h-[40px] items-center transition-colors hover:text-foreground"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {!cta.isAuthenticated && (
            <Link
              href={ctaHref("/auth/login")}
              className="hidden min-h-[40px] items-center rounded-full px-4 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground sm:flex"
            >
              Log in
            </Link>
          )}
          <Link
            href={cta.href}
            className="group flex min-h-[40px] items-center gap-2 rounded-full bg-foreground px-5 text-[14px] font-medium text-background transition-all will-change-transform hover:opacity-90 active:scale-[0.96]"
          >
            {cta.label}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </motion.header>

      <div className="relative mx-auto flex w-full max-w-[1800px] flex-1 flex-col gap-12 px-6 pb-10 md:px-12 lg:flex-row lg:items-center lg:gap-8 lg:pb-16">
        {/* Copy column */}
        <motion.div
          variants={copyContainerVariants}
          initial="hidden"
          animate="show"
          className="flex w-full flex-col items-start gap-7 pt-8 lg:w-[46%] lg:pt-0"
        >
          <motion.span
            variants={copyItemVariants}
            className="flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1.5 text-[13px] font-medium text-muted-foreground"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            {SHOWCASE_MODE ? "Early access — join the waitlist" : "Free plan · open source · self-host it"}
          </motion.span>

          <motion.h1
            variants={copyItemVariants}
            className="text-[3.25rem] leading-[1.03] font-normal tracking-tight text-balance sm:text-[4.25rem]"
          >
            Save anything.
            <br />
            Ask it anything.
          </motion.h1>

          <motion.p
            variants={copyItemVariants}
            className="max-w-lg text-[1.0625rem] leading-[1.65] text-pretty text-muted-foreground"
          >
            An article, a PDF, a screenshot, a voice note, a YouTube link. Each one is read,
            transcribed, summarized and tagged on the way in — so you can search it by meaning,
            ask questions in plain English, and watch it connect to everything else you&rsquo;ve kept.
          </motion.p>

          <motion.div variants={copyItemVariants} className="flex flex-wrap items-center gap-3">
            <Link
              href={cta.href}
              className="group flex min-h-[48px] items-center gap-2 rounded-full bg-foreground px-6 text-[15px] font-medium text-background transition-all will-change-transform hover:opacity-90 active:scale-[0.97]"
            >
              {cta.label}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/features"
              className="group flex min-h-[48px] items-center gap-2 rounded-full border border-border px-6 text-[15px] font-medium text-foreground transition-colors hover:bg-muted"
            >
              See what it does
              <ArrowRight className="h-4 w-4 opacity-60 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>

          <motion.p variants={copyItemVariants} className="text-[13px] text-muted-foreground">
            No card required. Your vault stays locked until you open it.
          </motion.p>
        </motion.div>

        {/* Art panel — bleeds off the right edge on large screens */}
        <motion.div
          variants={artVariants}
          initial="hidden"
          animate="show"
          className="relative -mx-6 aspect-[4/3] overflow-hidden rounded-[2rem] sm:aspect-[16/10] md:-mx-12 lg:mx-0 lg:-mr-12 lg:aspect-auto lg:h-[68vh] lg:w-[54%] lg:rounded-l-[2.5rem] lg:rounded-r-none"
        >
          <Image
            src={bgLight}
            alt="Panes of glass standing across a salt flat at sunrise, faint threads of light running between them"
            fill
            priority
            placeholder="blur"
            sizes="(max-width: 1024px) 100vw, 54vw"
            className="object-cover dark:hidden"
          />
          <Image
            src={bgDark}
            alt="The same salt flat at blue hour, the panes glowing and linked by threads of light"
            fill
            priority
            placeholder="blur"
            sizes="(max-width: 1024px) 100vw, 54vw"
            className="hidden object-cover dark:block"
          />
          {/* Hairline, not a border: keeps the panel from floating off a
              same-coloured background in light mode. */}
          <div className="pointer-events-none absolute inset-0 rounded-[2rem] ring-1 ring-inset ring-foreground/5 lg:rounded-l-[2.5rem] lg:rounded-r-none" />
        </motion.div>
      </div>

      {/* Capability row along the bottom edge */}
      <motion.div
        variants={capabilitiesVariants}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-[1800px] border-t border-border px-6 py-6 md:px-12"
      >
        <dl className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {CAPABILITIES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex items-start gap-3">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="flex flex-col gap-0.5">
                <dt className="text-[14px] font-medium text-foreground">{title}</dt>
                <dd className="text-[13px] leading-snug text-muted-foreground">{body}</dd>
              </div>
            </div>
          ))}
        </dl>
      </motion.div>
    </div>
  );
}
