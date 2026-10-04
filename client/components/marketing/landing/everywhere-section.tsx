"use client";

import { motion, type Variants } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ChromeIcon, Upload01Icon as Upload } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { MEMORY_TYPE_ICONS } from "@/lib/memory-icons";

// Grounded in what actually ships — and, for the Extension, in what the
// product ITSELF says: app/(platfrom)/app/integrations/page.tsx lists it
// under category "Coming soon" with the literal description "Not yet
// published to the Chrome Web Store." An earlier version of this section
// presented it as a live, present-tense capture surface — wrong, caught by
// checking the in-app page's own copy, not just whether the code exists in
// extension/. There's no mobile app — an earlier one was removed from the
// monorepo entirely, not just deprioritized.
interface Surface {
  icon: typeof ChromeIcon;
  title: string;
  body: string;
  comingSoon?: boolean;
}

const SURFACES: Surface[] = [
  {
    icon: MEMORY_TYPE_ICONS.web,
    title: "Web",
    body: "The full dashboard, wherever you're signed in. Nothing to install.",
  },
  {
    icon: Upload,
    title: "Import",
    body: "Bring in an existing bookmarks export or a plain list of links, all at once.",
  },
  {
    icon: ChromeIcon,
    title: "Extension",
    body: "Quick-capture from any tab with a keyboard shortcut — not yet published to the Chrome Web Store.",
    comingSoon: true,
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(5px)" },
  show: {
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { type: "spring", damping: 26, stiffness: 120 },
  },
};

function SurfaceCard({ surface }: { surface: Surface }) {
  return (
    <div
      className={`flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-5 ${surface.comingSoon ? "opacity-70" : ""}`}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-primary">
        <HugeiconsIcon icon={surface.icon} strokeWidth={2.25} className="h-4.5 w-4.5" />
      </span>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{surface.title}</h3>
          {surface.comingSoon && (
            <Badge variant="secondary" className="text-[9px] tracking-wide uppercase">
              Coming soon
            </Badge>
          )}
        </div>
        <p className="text-[13px] leading-relaxed text-muted-foreground">{surface.body}</p>
      </div>
    </div>
  );
}

export function EverywhereSection() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-24 sm:py-32 md:px-12">
      <div className="mx-auto mb-14 max-w-2xl text-center sm:mb-20">
        <span className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
          Wherever you already are
        </span>
        <h2 className="mt-4 text-3xl font-normal tracking-tight text-balance text-foreground sm:text-5xl">
          Capture doesn&apos;t wait for you to switch apps.
        </h2>
        <p className="mt-4 text-base text-pretty text-muted-foreground">
          Save from the dashboard today, or bring in what you already have — the
          browser extension is on the way.
        </p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.25 }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {SURFACES.map((surface) => (
          <motion.div key={surface.title} variants={cardVariants}>
            <SurfaceCard surface={surface} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

export default EverywhereSection;
