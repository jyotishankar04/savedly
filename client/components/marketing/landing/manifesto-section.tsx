"use client";

import { motion, useReducedMotion } from "motion/react";

// Each paragraph brightens as it reaches the middle of the screen, so the
// argument reads one step at a time. Muted spans are the aside inside a
// sentence, not a second color system.
const PARAGRAPHS: React.ReactNode[] = [
  <>Saving things got easy. Every app has a share button, and a bookmark costs nothing.</>,
  <>
    But something else happened. The pile got too big to look through.{" "}
    <span className="text-muted-foreground">
      You remember saving that article about pricing pages. You don&apos;t remember where, what it was called, or whether it was a tab, a
      screenshot, or a note to yourself.
    </span>
  </>,
  <>
    What you need isn&apos;t missing.{" "}
    <span className="text-muted-foreground">It&apos;s in there somewhere, under a title you&apos;d never think to search for.</span>
  </>,
  <>
    That&apos;s not a storage problem. It&apos;s a finding problem. And folders and tags don&apos;t solve it,{" "}
    <span className="text-muted-foreground">because nobody keeps them up to date.</span>
  </>,
  <>
    SaveForLatter reads everything you save and files it for you. Find it the way you remember it, or just ask, and the answer shows you
    which of your saves it came from.
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
            transition={reduce ? { duration: 0 } : { duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
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
