"use client";

import { motion, type Variants } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ViewOffIcon as EyeOff, Shield01Icon as Shield, Clock01Icon as Clock } from "@hugeicons/core-free-icons";
import { VaultDemoCard } from "@/components/marketing/landing/vault-demo-card";

const FACTS = [
  { icon: Shield, text: "PIN-protected, checked on the server — scrypt-hashed, never stored in the clear." },
  { icon: EyeOff, text: "Blurs the instant the window loses focus, before a lock can even round-trip." },
  { icon: Clock, text: "Switch tabs and it locks for real — coming back needs the PIN again, no cached view." },
];

const leftVariants: Variants = {
  hidden: { opacity: 0, y: 16, filter: "blur(5px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring", damping: 26, stiffness: 120 } },
};

const factsContainerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

export function VaultSection() {
  return (
    <section className="mx-auto grid w-full max-w-5xl grid-cols-1 items-center gap-12 px-6 py-24 sm:py-32 md:grid-cols-2 md:px-12">
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        variants={leftVariants}
        className="max-w-xl space-y-6"
      >
        <div className="space-y-5">
          <span className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
            Not for the whole library
          </span>
          <h2 className="text-3xl font-normal tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Some things you&apos;d rather no one else saw.
          </h2>
          <p className="text-lg leading-8 text-muted-foreground">
            A PIN-locked space inside your library, separate from everything else
            you&apos;ve saved — and it acts like one.
          </p>
        </div>

        <motion.ul variants={factsContainerVariants} initial="hidden" whileInView="show" viewport={{ once: true }} className="space-y-3">
          {FACTS.map((fact, i) => (
            <motion.li
              key={i}
              variants={leftVariants}
              className="flex items-start gap-3 text-sm text-muted-foreground"
            >
              <HugeiconsIcon icon={fact.icon} strokeWidth={2.25} className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{fact.text}</span>
            </motion.li>
          ))}
        </motion.ul>
      </motion.div>

      <div className="flex justify-center md:justify-end">
        <VaultDemoCard />
      </div>
    </section>
  );
}

export default VaultSection;
