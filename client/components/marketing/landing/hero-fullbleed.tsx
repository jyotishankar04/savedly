"use client";

import Image from "next/image";
import Link from "next/link";
import bgDark from "@/public/memora-bg-dark.webp";
import bgLight from "@/public/memora-bg-light.webp";
import { Logo } from "@/components/logo";
import { motion, type Variants } from "motion/react";
import { ArrowRight, Layers, MessageSquareQuote, SearchCheck } from "lucide-react";
import { useAuthCta } from "@/hooks/use-auth-cta";

/**
 * Hero A — full-bleed photograph with the copy sitting in the bottom band.
 * The salt-flat art forks by theme (sunrise / blue hour, same camera
 * position), so light and dark read as one place at two times of day.
 */
export default function HeroFullbleed() {
  const cta = useAuthCta();

  // Nav: slides down from top with blur, fast spring
  const navVariants: Variants = {
    hidden: { opacity: 0, y: -18, filter: 'blur(6px)' },
    show: {
      opacity: 1, y: 0, filter: 'blur(0px)',
      transition: { type: 'spring', damping: 22, stiffness: 150, delay: 0.1 },
    },
  };

  // Title: word-by-word cascade — each word rises from below with blur
  const titleWords = ["Save", "anything.", "Ask", "it", "anything."];
  const titleContainerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.09, delayChildren: 0.4 },
    },
  };
  const titleWordVariants: Variants = {
    hidden: { opacity: 0, y: 32, filter: 'blur(10px)', rotateX: 8 },
    show: {
      opacity: 1, y: 0, filter: 'blur(0px)', rotateX: 0,
      transition: { type: 'spring', damping: 26, stiffness: 95, mass: 1.1 },
    },
  };

  // Stats row: fades in from bottom, delayed after title
  const statsVariants: Variants = {
    hidden: { opacity: 0, y: 16, filter: 'blur(4px)' },
    show: {
      opacity: 1, y: 0, filter: 'blur(0px)',
      transition: { type: 'spring', damping: 24, stiffness: 110, delay: 1.05 },
    },
  };

  // Right column: body text then CTA, staggered
  const rightContainerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.14, delayChildren: 0.75 },
    },
  };
  const rightItemVariants: Variants = {
    hidden: { opacity: 0, x: 20, filter: 'blur(5px)' },
    show: {
      opacity: 1, x: 0, filter: 'blur(0px)',
      transition: { type: 'spring', damping: 20, stiffness: 100, mass: 0.9 },
    },
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background font-sans antialiased selection:bg-primary/25 selection:text-foreground">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        {/* Both themes' art is the same salt-flat scene at two times of day, so
            the light/dark swap reads as one place rather than two designs.
            `priority` on both: whichever one the theme reveals is the LCP. */}
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
        {/* Gradient for text legibility. The mid stop isn't fully transparent:
            a scatter of lit glass panes sits right where the headline and the
            right-hand column land, and without a slight floor those hot spots
            punch through the type. Measured over the art, every text region
            clears 7:1 against its own colour with this. */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/65 via-background/15 to-background/90" />
      </div>


      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1800px] flex-col justify-between px-6 py-6 md:px-12">

        {/* Navigation — drops from top */}
        <motion.nav
          variants={navVariants}
          initial="hidden"
          animate="show"
          className="flex items-center justify-between"
        >
          <div className="group flex cursor-pointer items-center gap-2 text-foreground">
            <Logo className="text-xl" />
          </div>

          <div className="hidden items-center gap-10 text-[13px] font-medium tracking-[0.05em] text-foreground/80 md:flex">
            {[
              { label: 'FEATURES', href: '/features' },
              { label: 'CONTRIBUTE', href: '/contribute' },
              { label: 'CHANGELOG', href: '/changelog' },
              { label: 'BLOG', href: '/blog' },
              { label: 'HELP', href: '/help' },
            ].map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="flex min-h-[40px] items-center transition-colors hover:text-foreground"
              >
                {label}
              </Link>
            ))}
          </div>

          <Link
            href={cta.href}
            className="group flex min-h-[40px] items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-[14px] font-medium text-primary-foreground shadow-sm transition-all will-change-transform hover:bg-primary/90 active:scale-[0.96]"
          >
            {cta.label}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.nav>

        {/* Bottom Content Area */}
        <div className="flex flex-col items-end justify-between gap-12 pb-8 lg:flex-row">

          {/* Left Column */}
          <div className="flex w-full flex-col gap-12 lg:w-1/2" style={{ perspective: '800px' }}>
            {/* Title: word-by-word cascade */}
            <motion.h1
              variants={titleContainerVariants}
              initial="hidden"
              animate="show"
              className="text-[3.5rem] leading-[1.05] font-normal tracking-tight text-foreground sm:text-[5rem]"
            >
              {titleWords.map((word, i) => (
                <motion.span
                  key={i}
                  variants={titleWordVariants}
                  className="mr-[0.22em] inline-block last:mr-0"
                >
                  {word}
                </motion.span>
              ))}
            </motion.h1>

            {/* Stats — fades in after title settles */}
            <motion.div
              variants={statsVariants}
              initial="hidden"
              animate="show"
              className="flex flex-wrap gap-x-12 gap-y-8 sm:gap-x-14"
            >
              {[
                { value: '6 formats', label: 'Links, videos, notes, images, docs, voice', icon: <Layers className="h-4 w-4" /> },
                { value: 'Hybrid search', label: 'Meaning and keywords, ranked together', icon: <SearchCheck className="h-4 w-4" /> },
                { value: 'Cited answers', label: 'Every reply links back to the memory', icon: <MessageSquareQuote className="h-4 w-4" /> },
              ].map(({ value, label, icon }) => (
                <div key={label} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-foreground">
                    <div className="text-primary">
                      {icon}
                    </div>
                    <span className="text-[1.25rem] font-medium tracking-wide tabular-nums">{value}</span>
                  </div>
                  <span className="ml-6 max-w-[15ch] text-[13px] leading-snug font-medium tracking-wide text-foreground/60">{label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right Column — slides in from right, staggered */}
          <motion.div
            variants={rightContainerVariants}
            initial="hidden"
            animate="show"
            className="flex w-full flex-col items-start gap-8 lg:w-[450px] lg:items-start"
          >
            <motion.p
              variants={rightItemVariants}
              className="text-[1.125rem] leading-[1.6] font-normal text-pretty text-foreground/90"
            >
              Send in an article, a PDF, a screenshot, a voice note or a YouTube link. Every one gets read, transcribed, summarized and tagged on the way in — then search it by meaning, ask questions in plain English, and see how it all connects on your memory graph.
            </motion.p>

            <motion.div variants={rightItemVariants} className="flex flex-col gap-3">
              <Link
                href={cta.href}
                className="group flex min-h-[40px] w-fit items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-[15px] font-medium text-primary-foreground shadow-md transition-all will-change-transform hover:bg-primary/90 active:scale-[0.96]"
              >
                {cta.label}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <span className="text-[13px] font-medium text-foreground/55">
                Free plan, no card required. Open source, and you can self-host it.
              </span>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
