"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "motion/react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { cn } from "@/lib/utils";

// One capability, told as a short list beside a picture. On a wide screen the
// block holds still while you scroll: the headline stays, the list moves up
// so the current item sits under it, a thin line fills as you go, and the
// picture changes with the item. On a phone it's a plain list you tap.

const EASE = [0.16, 1, 0.3, 1] as const;

export interface FeatureItem {
  icon: IconSvgElement;
  title: string;
  body: string;
  Picture: () => React.ReactNode;
}

export interface FeatureBlockProps {
  id?: string;
  label: string;
  labelIcon: IconSvgElement;
  title: string;
  items: FeatureItem[];
  /** Tailwind gradient classes for the square behind the picture. */
  tone: string;
  /** Put the picture on the left. */
  flip?: boolean;
}

function usePinned(): boolean {
  const reduce = useReducedMotion();
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px) and (min-height: 640px)");
    const update = () => setWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return wide && !reduce;
}

export function FeatureBlock({ id, label, labelIcon, title, items, tone, flip = false }: FeatureBlockProps) {
  const pinned = usePinned();
  const reduce = useReducedMotion();
  const track = useRef<HTMLDivElement>(null);
  const rows = useRef<(HTMLLIElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [offset, setOffset] = useState(0);
  const { scrollYProgress } = useScroll({ target: track, offset: ["start start", "end end"] });

  // How far through the current item the scroll is, for its progress line.
  const within = useTransform(scrollYProgress, (p) => {
    const at = Math.min(0.9999, Math.max(0, p)) * items.length;
    return at - Math.floor(at);
  });

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (!pinned) return;
    setActive(Math.min(items.length - 1, Math.max(0, Math.floor(p * items.length))));
  });

  // Slide the list so the current item sits at the top of its window.
  useLayoutEffect(() => {
    setOffset(pinned ? (rows.current[active]?.offsetTop ?? 0) : 0);
  }, [active, pinned]);

  function choose(index: number) {
    const el = track.current;
    if (pinned && el) {
      const start = el.getBoundingClientRect().top + window.scrollY;
      const span = el.offsetHeight - window.innerHeight;
      window.scrollTo({ top: start + ((index + 0.5) / items.length) * span, behavior: "smooth" });
    } else {
      setActive(index);
    }
  }

  const Picture = items[active].Picture;

  const picture = (
    <div className={cn("relative aspect-square w-full overflow-hidden rounded-[2rem] bg-gradient-to-b sm:rounded-[2.5rem]", tone)}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active}
          className="absolute inset-0 flex items-center justify-center p-6 sm:p-10"
          initial={reduce ? false : { opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? undefined : { opacity: 0, y: -10 }}
          transition={{ duration: 0.45, ease: EASE }}
        >
          <Picture />
        </motion.div>
      </AnimatePresence>
    </div>
  );

  return (
    <section id={id} className="scroll-mt-24 bg-background font-sans antialiased">
      <div ref={track} style={pinned ? { height: `calc(100vh + ${items.length * 55}vh)` } : undefined} className="relative">
        <div className={cn("mx-auto w-full max-w-6xl px-5 sm:px-8", pinned ? "sticky top-0 flex h-screen items-center pt-16" : "py-16")}>
          <div className={cn("grid w-full items-start gap-10 lg:grid-cols-2 lg:gap-16", flip && "lg:[&>*:first-child]:order-2")}>
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <HugeiconsIcon icon={labelIcon} strokeWidth={2.25} className="h-3.5 w-3.5" />
                </span>
                {label}
              </p>
              <h2 className="mt-3 font-serif text-[clamp(2rem,4vw,3rem)] font-medium leading-[1.08] tracking-[-0.025em] text-balance text-foreground">{title}</h2>

              {/* Phones: the picture comes before the list it illustrates. */}
              <div className="mt-8 lg:hidden">{picture}</div>

              <div className={cn("mt-8 border-t border-foreground/15", pinned && "h-[46vh] overflow-hidden [mask-image:linear-gradient(to_bottom,black_70%,transparent)]")}>
                {/* `relative`, so each row's offsetTop is measured from this list whether or not it has moved yet. */}
                <motion.ul className="relative" animate={{ y: -offset }} transition={reduce ? { duration: 0 } : { duration: 0.6, ease: EASE }}>
                  {items.map((item, i) => {
                    const current = i === active;
                    return (
                      <li
                        key={item.title}
                        ref={(el) => {
                          rows.current[i] = el;
                        }}
                        className={cn("relative border-b border-foreground/15 transition-opacity duration-500", current ? "opacity-100" : pinned && i < active ? "opacity-0" : "opacity-35")}
                      >
                        <button
                          type="button"
                          aria-current={current}
                          onClick={() => choose(i)}
                          className="block w-full py-7 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 lg:py-9"
                        >
                          <span className="flex items-center gap-2.5 text-[17px] font-medium tracking-[-0.01em] text-foreground">
                            <HugeiconsIcon icon={item.icon} strokeWidth={2} className="h-5 w-5 shrink-0" />
                            {item.title}
                          </span>
                          <span className="mt-2.5 block max-w-md text-[15px] leading-relaxed text-muted-foreground">{item.body}</span>
                        </button>
                        {pinned && current && <motion.span aria-hidden style={{ scaleX: within }} className="absolute inset-x-0 -bottom-px block h-0.5 origin-left bg-primary" />}
                      </li>
                    );
                  })}
                </motion.ul>
              </div>
            </div>

            <div className="hidden lg:block">{picture}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
