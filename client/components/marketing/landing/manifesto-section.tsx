"use client";

import { motion, useReducedMotion } from "motion/react";

// Each paragraph brightens as it reaches the middle of the screen, so the
// argument reads one step at a time. Muted spans are the aside inside a
// sentence, not a second color system.
const PARAGRAPHS: React.ReactNode[] = [
  <>Saving things got easy. Finding them again didn&apos;t.</>,
  <>
    Every app has a share button. Every browser has a bookmark.{" "}
    <span className="text-muted-foreground">
      So we save everything—articles, videos, screenshots, notes, PDFs, ideas.
    </span>
  </>,
  <>
    Then, eventually, we need something we saved.{" "}
    <span className="text-muted-foreground">
      We remember what it was about. Maybe we even remember why we saved it. But
      we don&apos;t remember where it went, what we called it, or which app we
      put it in.
    </span>
  </>,
  <>
    The thing you&apos;re looking for isn&apos;t gone. It&apos;s just buried.
  </>,
  <>
    That&apos;s not really a storage problem. It&apos;s a finding problem.{" "}
    <span className="text-muted-foreground">
      And folders and tags only help if you remember to organize everything
      yourself.
    </span>
  </>,
  <>Memora takes care of that part.</>,
  <>
    Save something once and Memora understands what&apos;s inside. Later, find
    it the way you remember it—or just ask.{" "}
    <span className="text-muted-foreground">
      And when it answers, it shows you exactly which saved item it came from.
    </span>
  </>,
];

export function ManifestoSection() {
  const reduce = useReducedMotion();
  return (
    <section className="bg-background px-5 py-20 sm:px-6 md:py-32">
      <div className="mx-auto max-w-2xl space-y-9">
        {PARAGRAPHS.map((p, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0.18 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "0px 0px -40% 0px" }}
            transition={
              reduce
                ? { duration: 0 }
                : { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
            }
            className="text-2xl leading-[1.3] font-semibold tracking-[-0.02em] text-pretty text-foreground sm:text-[1.75rem]"
          >
            {p}
          </motion.p>
        ))}
      </div>
    </section>
  );
}

export default ManifestoSection;
