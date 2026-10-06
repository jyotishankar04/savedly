"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon as ChevronDownIcon } from "@hugeicons/core-free-icons";
import { useState } from "react";

const ANIMATION_DURATION = 0.5;

// Adapted from @shoogle/smoothui/faq-2 — free, already token-based
// (text-foreground, border-border), already using motion/react (no
// framer-motion swap needed). Only real changes: hover:border-brand → a
// token this project actually has, and every question/answer replaced —
// the reference's defaults are about SmoothUI itself ("Is it free to
// use?", "What frameworks are supported?"). Answers here are checked
// against the same facts established building the rest of this page: the
// vault is a PIN gate, not encryption; the extension is Chrome-only and
// not yet published; there's no mobile app.
interface Faq {
  question: string;
  answer: string;
}

const FAQS: Faq[] = [
  {
    question: "What can I save?",
    answer: "Links, notes, screenshots, PDFs and videos.",
  },
  {
    question: "How does SaveForLatter find things?",
    answer:
      "SaveForLatter understands the content and meaning of what you save, so you can search using normal words instead of remembering exact titles or keywords.",
  },
  {
    question: "Can I ask questions about my saved things?",
    answer: "Yes. Ask questions in plain English and SaveForLatter uses your saved memories to help you find the answer.",
  },
  {
    question: "Is SaveForLatter open source?",
    answer: "Yes. You can inspect the code, run SaveForLatter yourself, and contribute to the project.",
  },
  {
    question: "Where is my data stored?",
    answer:
      "Your data is stored according to the deployment you choose. If you self-host SaveForLatter, you control the infrastructure and data.",
  },
  {
    question: "Is my vault encrypted?",
    answer:
      "No — it's PIN-protected, not encrypted. Your PIN is scrypt-hashed and checked on the server; the vault blurs the instant the window loses focus and locks for real when you switch tabs. That's real access control, but it isn't end-to-end encryption of the content itself, and we'd rather say that plainly than let the word \"locked\" imply more than it does.",
  },
  {
    question: "Is the browser extension available yet?",
    answer:
      "Not yet — it's built (Chrome only, Manifest V3) but not published to the Chrome Web Store. The dashboard and bulk import work today; the extension is coming.",
  },
  {
    question: "Is there a mobile app?",
    answer: "No native app — the web dashboard is fully responsive and works well in a mobile browser instead.",
  },
  {
    question: "What can I import from another tool?",
    answer:
      "A bookmarks export (the standard HTML file every browser can produce) or a plain list of URLs, all at once. It's exactly those two formats today — nothing more specific is supported yet.",
  },
  {
    question: "Is there a free plan?",
    answer:
      "Yes. The Free plan has the essentials and some AI we supply each month, with no card required. Lite and Pro add more room, more AI and features like the private vault. You can also self-host it for free with everything unlocked — it's open source.",
  },
];

export function FaqSection() {
  const shouldReduceMotion = useReducedMotion();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-background px-5 py-16 sm:px-6 md:py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": FAQS.map((faq) => ({
              "@type": "Question",
              "name": faq.question,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer,
              },
            })),
          }),
        }}
      />
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div className="max-w-sm">
          <h2 className="text-3xl leading-[1.08] font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">A few things you might be wondering.</h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">The honest version of what the rest of this page claims.</p>
        </div>

        <div className="border-t border-foreground/10">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            const panelId = `faq-panel-${index}`;
            return (
              <div key={faq.question} className="border-b border-foreground/10">
                <h3>
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="group flex w-full items-center justify-between gap-6 py-6 text-left focus-visible:outline-none"
                  >
                    <span className="text-lg font-medium text-foreground underline-offset-4 group-hover:underline group-focus-visible:underline">
                      {faq.question}
                    </span>
                    <motion.span
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={shouldReduceMotion ? { duration: 0 } : { duration: ANIMATION_DURATION, ease: [0.16, 1, 0.3, 1] }}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-foreground/15"
                    >
                      <HugeiconsIcon icon={ChevronDownIcon} className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
                    </motion.span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={panelId}
                      initial={shouldReduceMotion ? { opacity: 1 } : { height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={shouldReduceMotion ? { opacity: 0, transition: { duration: 0 } } : { height: 0, opacity: 0 }}
                      transition={shouldReduceMotion ? { duration: 0 } : { duration: ANIMATION_DURATION, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-2xl pb-7 text-[15px] leading-relaxed text-muted-foreground">{faq.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default FaqSection;
