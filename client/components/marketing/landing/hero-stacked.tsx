"use client";

import Image from "next/image";
import Link from "next/link";
import bgDark from "@/public/memora-bg-dark.webp";
import bgLight from "@/public/memora-bg-light.webp";
import { motion, type Variants } from "motion/react";
import { ArrowRight, Layers, MessageSquareQuote, SearchCheck } from "lucide-react";
import { SHOWCASE_MODE } from "@/lib/showcase";
import { Navbar } from "@/components/marketing/navbar";
import { useAuthCta } from "@/hooks/use-auth-cta";
import { GithubStarButton } from "@/components/marketing/github-star-button";

const CAPABILITIES = [
  { icon: Layers, body: "Links, videos, notes, images, documents and voice all go in the same box." },
  { icon: SearchCheck, body: "Search by meaning or by keyword — both legs are ranked into one list." },
  { icon: MessageSquareQuote, body: "Ask in plain English and every answer links back to the memory it came from." },
] as const;

// Badge above the headline: gentle fade up
const supportVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring", damping: 24, stiffness: 100 } },
};

// Title: two lines, each slides up with blur, staggered
const titleContainerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.18, delayChildren: 0.3 } },
};
const titleLineVariants: Variants = {
  hidden: { opacity: 0, y: 40, filter: "blur(12px)" },
  show: {
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { type: "spring", damping: 30, stiffness: 90, mass: 1.2 },
  },
};

// Subtitle + CTA: delayed until the title has settled
const bodyContainerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.13, delayChildren: 0.85 } },
};
const bodyItemVariants: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(4px)" },
  show: {
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { type: "spring", damping: 22, stiffness: 110 },
  },
};

// Footer: each column fades up, very late
const footerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 1.3 } },
};
const footerItemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { type: "spring", damping: 20, stiffness: 130 } },
};

/**
 * Hero C — full-bleed art with the copy left-aligned and vertically centred,
 * a three-up capability row along the bottom.
 *
 * Colours are all theme tokens, so there are no `dark:` overrides to keep in
 * sync — `background` and `foreground` already invert. Type over the artwork
 * uses `foreground` at an alpha rather than `muted-foreground`: the latter is
 * a mid grey that only clears ~3:1 against the scrimmed light photograph,
 * where foreground/70 holds ~7:1.
 */
export default function HeroStacked() {
  const cta = useAuthCta();

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background font-sans antialiased selection:bg-primary/25 selection:text-foreground">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <Image
          src={bgLight}
          alt=""
          aria-hidden="true"
          fill
          priority
          placeholder="blur"
          sizes="100vw"
          className="object-cover dark:hidden"
        />
        <Image
          src={bgDark}
          alt=""
          aria-hidden="true"
          fill
          priority
          placeholder="blur"
          sizes="100vw"
          className="hidden object-cover dark:block"
        />
        {/* The copy sits over the middle-left of the art, where the horizon
            glare (light) and the lit panes (dark) both live — so the scrim is
            strongest through the middle band rather than at the edges. */}
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/60 to-transparent" />
        {/* The capability row runs the full width, out past where the
            horizontal scrim has faded to nothing — and in dark mode that's
            exactly where the brightest panes sit. Second scrim, bottom-up,
            just for that band. */}
        <div className="absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-background/92 via-background/50 to-transparent" />
      </div>

      {/* The shared Navbar (components/marketing/navbar.tsx) replaces the
          hero's own inline one — it already has a homepage-aware
          "useWhiteText" mode (light text over this art until scrolled,
          checked via usePathname), plus real auth-state awareness ("Go to
          Dashboard" instead of Log in/Start free once signed in, a loading
          skeleton, a mobile sheet menu, Features/Resources mega-menus)
          that the old bespoke nav never had. It's `fixed`, so it renders
          outside the normal flow here — `main` below picks up pt-32 to
          clear it, the same allowance every other marketing page uses. */}
      <Navbar />

      <div className="relative z-10 flex min-h-screen flex-col">
        <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col justify-center px-6 pt-32 pb-20 md:px-8">
          <div className="flex max-w-5xl flex-col items-start">
            {/* Where the reference puts an avatar stack and a customer count.
                Pre-launch that would be invented, so this states something
                true instead, and follows the deployment's own mode. */}
            <motion.div
              variants={supportVariants}
              initial="hidden"
              animate="show"
              transition={{ delay: 0.2 }}
              className="mb-8 flex items-center gap-2 rounded-full border border-border bg-background/70 px-3.5 py-1.5 backdrop-blur-sm"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              <p className="text-[13px] font-medium tracking-tight text-foreground/75">
                {SHOWCASE_MODE ? "Early access — join the waitlist" : "Free plan · open source · self-host it"}
              </p>
            </motion.div>

            <motion.h1
              variants={titleContainerVariants}
              initial="hidden"
              animate="show"
              className="mb-6 max-w-4xl text-[3.25rem] leading-[1.05] font-normal tracking-[-0.02em] text-foreground sm:text-[4.5rem]"
            >
              <motion.span variants={titleLineVariants} className="block">
                Save anything.
              </motion.span>
              <motion.span variants={titleLineVariants} className="block">
                Ask it anything.
              </motion.span>
            </motion.h1>

            <motion.div
              variants={bodyContainerVariants}
              initial="hidden"
              animate="show"
              className="flex flex-col items-start gap-10"
            >
              <motion.p
                variants={bodyItemVariants}
                className="max-w-xl text-lg leading-[1.45] font-normal text-pretty text-foreground/70 sm:text-[1.25rem]"
              >
                Articles, PDFs, screenshots, voice notes, YouTube links — each one read,
                transcribed, summarized and tagged on the way in, then searchable by meaning
                and answerable in plain English.
              </motion.p>

              <motion.div variants={bodyItemVariants} className="flex flex-wrap items-center gap-5">
                <Link
                  href={cta.href}
                  className="group flex min-h-[40px] items-center gap-2 rounded-full bg-primary px-7 py-4 text-[16px] font-medium text-primary-foreground shadow-md transition-all will-change-transform hover:bg-primary/90 active:scale-[0.96]"
                >
                  {cta.label}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>

                <GithubStarButton variant="hero" />

                {/* The reference's second CTA is a Watch Demo play button.
                    There's no demo film, so this goes to the feature tour and
                    keeps the circular affordance. */}
                <Link
                  href="/features"
                  className="group flex min-h-[40px] items-center gap-3 rounded-full px-4 py-4 text-[16px] font-medium text-foreground transition-all will-change-transform hover:opacity-80 active:scale-[0.96]"
                >
                  See what it does
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background shadow-md transition-transform group-hover:scale-105">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </main>

        <motion.div
          variants={footerContainerVariants}
          initial="hidden"
          animate="show"
          className="mx-auto flex w-full max-w-[1600px] flex-col items-end justify-between gap-10 px-6 pb-10 md:px-8 lg:flex-row"
        >
          <div className="grid w-full grid-cols-1 gap-10 md:grid-cols-3 md:gap-16 lg:w-3/4">
            {CAPABILITIES.map(({ icon: Icon, body }) => (
              <motion.div key={body} variants={footerItemVariants} className="flex flex-col gap-3">
                <Icon className="h-6 w-6 stroke-[1.5] text-primary" />
                <p className="max-w-[230px] text-[14px] leading-snug font-medium text-pretty text-foreground/85">
                  {body}
                </p>
              </motion.div>
            ))}
          </div>

          {/* The reference ends on "Scroll to Discover". Nothing follows this
              hero yet, so the corner points somewhere that exists. */}
          <motion.div variants={footerItemVariants}>
            <Link
              href="/contribute"
              className="group flex items-center gap-2 pb-2 text-sm font-medium whitespace-nowrap text-foreground/80 transition-colors hover:text-foreground"
            >
              <span>Free & open source</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
