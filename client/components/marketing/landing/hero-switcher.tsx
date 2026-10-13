"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ArrowRight01Icon as ArrowRightIcon,
  BookmarkAdd01Icon as SaveIcon,
  BubbleChatIcon as AskIcon,
  Cancel01Icon as CloseIcon,
  FolderLibraryIcon as OrganizeIcon,
  Search01Icon as SearchIcon,
} from "@hugeicons/core-free-icons";
import { Navbar } from "@/components/marketing/navbar";
import { GithubStarButton } from "@/components/marketing/github-star-button";
import { ProductHuntBadge } from "@/components/marketing/product-hunt-badge";
import { useAuthCta } from "@/hooks/use-auth-cta";
import { cn } from "@/lib/utils";
import { AskScene, OrganizeScene, SaveScene, SearchScene } from "@/components/marketing/landing/product-scenes";

// The hero: a plain statement, then the product shown as four small scenes
// on a coloured panel. On a wide screen the panel grows to almost fill the screen
// as you reach it, holds while you scroll through the scenes, then shrinks
// back and lets the page move on; on a phone the scenes advance by
// themselves and by tap.

const EASE = [0.16, 1, 0.3, 1] as const;

interface Tab {
  id: string;
  label: string;
  icon: IconSvgElement;
  title: string;
  body: string;
  href: string;
  Scene: () => React.ReactNode;
  /** Three colours for the panel behind this scene. */
  tones: [string, string, string];
}

const TABS: Tab[] = [
  {
    id: "save",
    label: "Save",
    icon: SaveIcon,
    title: "Save it in one step",
    body: "Paste a link, drop a file, or type a note. Savedly reads it, writes a summary, tags it, and files it in the right collection.",
    href: "/features#how-it-works",
    Scene: SaveScene,
    tones: ["#9dbcff", "#c3e6ff", "#b9c8ff"],
  },
  {
    id: "search",
    label: "Search",
    icon: SearchIcon,
    title: "Find it by what you remember",
    body: "Describe it in your own words. Search matches the meaning as well as the exact words, so a half-remembered idea is enough.",
    href: "/features#search",
    Scene: SearchScene,
    tones: ["#a9b4ff", "#cfc4ff", "#9cc4ff"],
  },
  {
    id: "ask",
    label: "Ask",
    icon: AskIcon,
    title: "Ask your library a question",
    body: "Get an answer in plain words, drawn only from what you saved, with the memories it used listed underneath.",
    href: "/features#ask",
    Scene: AskScene,
    tones: ["#c2b2ff", "#e7c4ff", "#a8b6ff"],
  },
  {
    id: "organize",
    label: "Organize",
    icon: OrganizeIcon,
    title: "Organized without the filing",
    body: "Collections and tags fill themselves in. A date in a note becomes an event you can put on your calendar in one tap.",
    href: "/features#formats",
    Scene: OrganizeScene,
    tones: ["#a6e3ea", "#a9c8ff", "#c4f0d6"],
  },
];

const ROTATE_MS = 6500;

/** Whether the panel should hold still while the page scrolls under it. */
function usePinned(): boolean {
  const reduce = useReducedMotion();
  const [wide, setWide] = useState(false);
  useEffect(() => {
    // A phone pins too, when it is tall enough to hold the words and the picture at once.
    const query = window.matchMedia("(min-width: 1024px) and (min-height: 640px), (max-width: 1023px) and (min-height: 600px)");
    const update = () => setWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return wide && !reduce;
}

// The demos are drawn for a box about this tall. On a phone the box grows a
// little with the screen, and the demo is enlarged to match, up to a limit:
// past it the demo would be too narrow to read.
const SCENE_BASE_HEIGHT = 220;
const SCENE_MAX_SCALE = 1.18;

/** How much to enlarge the demo so it fills its box. 1 until measured, and on wide screens, which size it in CSS. */
function useSceneScale(box: React.RefObject<HTMLDivElement | null>, enabled: boolean): number {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = box.current;
    if (!enabled || !el) return;
    const narrow = window.matchMedia("(max-width: 1023px)");
    const measure = () => setScale(narrow.matches ? Math.min(SCENE_MAX_SCALE, Math.max(1, el.clientHeight / SCENE_BASE_HEIGHT)) : 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    narrow.addEventListener("change", measure);
    return () => {
      observer.disconnect();
      narrow.removeEventListener("change", measure);
    };
  }, [box, enabled]);
  return enabled ? scale : 1;
}

/** The soft, slowly drifting colour behind the scenes. */
function Backdrop({ tones }: { tones: [string, string, string] }) {
  const reduce = useReducedMotion();
  const blobs = [
    { className: "-left-[10%] -top-[25%] h-[75%] w-[60%]", drift: { x: [0, 40, 0], y: [0, 24, 0] }, seconds: 19 },
    { className: "-right-[12%] top-[5%] h-[80%] w-[58%]", drift: { x: [0, -34, 0], y: [0, 30, 0] }, seconds: 23 },
    { className: "bottom-[-35%] left-[22%] h-[75%] w-[62%]", drift: { x: [0, 26, 0], y: [0, -28, 0] }, seconds: 27 },
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden bg-primary/[0.07] dark:bg-primary/[0.12]">
      {blobs.map((blob, i) => (
        <motion.div
          key={i}
          className={cn("absolute rounded-full opacity-90 blur-3xl dark:opacity-35", blob.className)}
          animate={{ backgroundColor: tones[i], ...(reduce ? {} : blob.drift) }}
          transition={{
            backgroundColor: { duration: 1.1, ease: "easeInOut" },
            x: { duration: blob.seconds, repeat: Infinity, ease: "easeInOut" },
            y: { duration: blob.seconds, repeat: Infinity, ease: "easeInOut" },
          }}
        />
      ))}
    </div>
  );
}

// Where, along the pinned stretch, the panel has finished growing to fill
// the screen and where it starts to shrink again. The scenes change between.
const HOLD_FROM = 0.16;
const HOLD_TO = 0.84;

function Switcher() {
  const pinned = usePinned();
  const reduce = useReducedMotion();
  const track = useRef<HTMLDivElement>(null);
  const sceneBox = useRef<HTMLDivElement>(null);
  const sceneScale = useSceneScale(sceneBox, pinned);
  const [active, setActive] = useState(0);
  const [touched, setTouched] = useState(false);
  const { scrollYProgress } = useScroll({ target: track, offset: ["start start", "end end"] });

  // 0 = a rounded panel set well in from the edges, 1 = nearly the whole
  // screen, still with a thin margin and rounded corners.
  // It grows as the page reaches it, holds while the scenes change, then
  // shrinks back before the page moves on. The spring takes the steps out of
  // a mouse wheel.
  const grow = useSpring(useTransform(scrollYProgress, [0, HOLD_FROM, HOLD_TO, 1], [0, 1, 1, 0]), { stiffness: 140, damping: 30, mass: 0.5 });
  const side = useTransform(grow, (g) => `calc(${g.toFixed(4)} * 1.25rem + ${(1 - g).toFixed(4)} * max(4vw, (100vw - 1240px) / 2))`);
  const top = useTransform(grow, (g) => `${(16 + (1 - g) * 76).toFixed(2)}px`);
  const bottom = useTransform(grow, (g) => `${(16 + (1 - g) * 28).toFixed(2)}px`);
  const radius = useTransform(grow, (g) => `${(36 + (1 - g) * 4).toFixed(2)}px`);
  const skipClickable = useTransform(grow, (g) => (g > 0.6 ? "auto" : "none"));

  // Wide screens: the scroll position picks the scene.
  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    if (!pinned) return;
    const within = (progress - HOLD_FROM) / (HOLD_TO - HOLD_FROM);
    setActive(Math.min(TABS.length - 1, Math.max(0, Math.floor(within * TABS.length))));
  });

  // Elsewhere: the scenes take turns until someone picks one.
  useEffect(() => {
    if (pinned || reduce || touched) return;
    const t = setTimeout(() => setActive((i) => (i + 1) % TABS.length), ROTATE_MS);
    return () => clearTimeout(t);
  }, [active, pinned, reduce, touched]);

  function choose(index: number) {
    setTouched(true);
    const el = track.current;
    if (pinned && el) {
      // Move the page to where this scene lives, so scrolling carries on from it.
      const start = el.getBoundingClientRect().top + window.scrollY;
      const span = el.offsetHeight - window.innerHeight;
      const at = HOLD_FROM + ((index + 0.5) / TABS.length) * (HOLD_TO - HOLD_FROM);
      window.scrollTo({ top: start + at * span, behavior: "smooth" });
    } else {
      setActive(index);
    }
  }

  /** Past the whole pinned stretch in one step, for anyone who doesn't want to scroll through it. */
  function skip() {
    const el = track.current;
    if (!el) return;
    const end = el.getBoundingClientRect().top + window.scrollY + el.offsetHeight;
    // Instant on purpose: a smooth scroll would play every scene on the way.
    window.scrollTo({ top: end - 72, behavior: "instant" });
  }

  const tab = TABS[active];
  const Scene = tab.Scene;

  return (
    <div ref={track} className={cn("relative mt-14 md:mt-20", pinned && "h-[300svh] lg:h-[480vh]")}>
      <div className={cn(pinned ? "sticky top-0 h-svh" : "mx-auto w-full max-w-[1240px] px-3 sm:px-5")}>
        <motion.div
          style={pinned ? { top, bottom, left: side, right: side, borderRadius: radius } : undefined}
          className={cn(
            "flex flex-col items-center justify-center overflow-hidden px-3 sm:px-8 sm:py-12",
            // Pinned on a phone: room at the top for the navigation bar that floats over the panel.
            // The tabs and card keep their own height and sit in the middle of what's left.
            pinned ? "absolute pb-3 pt-[4.5rem] lg:py-12" : "relative rounded-[1.75rem] py-8 sm:rounded-[2.25rem]",
          )}
        >
          <Backdrop tones={tab.tones} />

          {pinned && (
            <motion.button
              type="button"
              onClick={skip}
              aria-label="Skip to the next section"
              title="Skip"
              // Appears as the panel grows, and can't be tabbed to or clicked before then.
              style={{ opacity: grow, pointerEvents: skipClickable }}
              // Below the navigation bar: its strip spans the full width and would take the click.
              className="absolute right-3 top-[4.5rem] z-20 flex h-9 w-9 items-center lg:right-6 lg:top-[5.5rem] lg:h-11 lg:w-11 justify-center rounded-xl bg-card/60 text-foreground/70 ring-1 ring-foreground/10 backdrop-blur transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <HugeiconsIcon icon={CloseIcon} strokeWidth={2} className="h-5 w-5" />
            </motion.button>
          )}

          <div role="tablist" aria-label="What Savedly does" className={cn("relative z-10 flex gap-2", pinned && "max-lg:self-start")}>
            {TABS.map((t, i) => {
              const selected = i === active;
              return (
                <button
                  key={t.id}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  aria-controls="hero-scene"
                  onClick={() => choose(i)}
                  className={cn(
                    "group flex h-10 items-center gap-2 rounded-2xl px-3 text-sm font-medium lg:h-11 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                    selected
                      ? "bg-card text-foreground shadow-md ring-1 ring-foreground/[0.06]"
                      : "bg-card/55 text-muted-foreground hover:bg-card/85 hover:text-foreground",
                  )}
                >
                  <HugeiconsIcon icon={t.icon} strokeWidth={2} className={cn("h-[18px] w-[18px]", selected && "text-primary")} />
                  <span className={cn(selected ? "inline" : "hidden sm:inline")}>{t.label}</span>
                </button>
              );
            })}
          </div>

          <div
            id="hero-scene"
            role="tabpanel"
            className={cn(
              "relative z-10 mt-3 grid w-full max-w-6xl items-center gap-4 rounded-[1.5rem] bg-card/95 p-4 shadow-xl sm:mt-5 sm:gap-6 sm:p-5 shadow-primary/10 ring-1 ring-foreground/[0.05] backdrop-blur sm:p-8 md:grid-cols-[1fr_1.15fr] md:gap-12 md:p-10 lg:p-12",
            )}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`text-${tab.id}`}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                <p className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  <HugeiconsIcon icon={tab.icon} strokeWidth={2} className="h-4 w-4" />
                  {tab.label}
                </p>
                <h2 className={cn("mt-2 font-medium leading-[1.1] tracking-[-0.03em] text-balance text-foreground sm:mt-3 sm:text-4xl lg:text-[2.75rem]", pinned ? "text-[clamp(1.65rem,3.9svh,2.15rem)]" : "text-[1.65rem]")}>
                  {tab.title}
                </h2>
                <p className={cn("mt-2.5 max-w-md leading-relaxed text-pretty text-muted-foreground sm:mt-4 sm:text-[15px]", pinned ? "text-[clamp(15px,2.1svh,17.5px)]" : "text-[15px]")}>{tab.body}</p>
                <Link
                  href={tab.href}
                  className="group mt-4 hidden items-center gap-1.5 border-b border-foreground/25 pb-1 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary sm:mt-6 sm:inline-flex [@media(min-height:780px)]:inline-flex"
                >
                  See how it works
                  <HugeiconsIcon icon={ArrowRightIcon} strokeWidth={2} className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </motion.div>
            </AnimatePresence>

            <div ref={sceneBox} className={cn("relative overflow-hidden rounded-2xl bg-muted/70 ring-1 ring-foreground/[0.04] sm:h-[310px] lg:h-[400px]", pinned ? "h-[clamp(220px,33svh,290px)]" : "h-[270px]")}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`scene-${tab.id}`}
                  className="absolute inset-0"
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduce ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Drawn at phone size, enlarged where there is room: by a fixed
                      amount on a wide screen, and to fit the box on a tall phone. A
                      box drawn smaller by the same factor it is then enlarged by
                      ends up exactly filling the space. */}
                  <div
                    className="h-full w-full origin-top-left lg:h-[80%] lg:w-[80%] lg:scale-125"
                    style={sceneScale > 1 ? { width: `${100 / sceneScale}%`, height: `${100 / sceneScale}%`, transform: `scale(${sceneScale})` } : undefined}
                  >
                    <Scene />
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function HeroSwitcher() {
  const cta = useAuthCta();
  const reduce = useReducedMotion();
  // The starting state is the same whether or not motion is reduced: the
  // server can't know the setting, and a different first render in the
  // browser is a hydration error. Reduced motion skips the travel instead.
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 16 } as const,
    animate: { opacity: 1, y: 0 },
    transition: reduce ? { duration: 0 } : { duration: 0.7, ease: EASE, delay },
  });

  return (
    // z-40 and `isolate`: the fixed navbar lives in here and must stay above
    // anything with a z-index further down the page.
    <section className="relative isolate z-40 bg-background pb-6 font-sans antialiased selection:bg-primary/25">
      <Navbar />

      <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-5 pt-32 text-center sm:px-8 md:pt-40">
        <motion.div {...rise(0)}>
          <ProductHuntBadge variant="featured" height={40} />
        </motion.div>

        <motion.h1
          {...rise(0.06)}
          className="mt-8 text-[clamp(2.1rem,6vw,4.75rem)] font-medium leading-[1.04] tracking-[-0.04em] text-balance text-foreground"
        >
          <span className="block">Save anything.</span>
          <span className="block">Find it when you need it.</span>
        </motion.h1>

        <motion.p {...rise(0.14)} className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">
          Links, notes, screenshots, PDFs and videos. Savedly reads each one, files it, and finds it again from whatever you remember about it.
        </motion.p>

        <motion.div {...rise(0.22)} className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={cta.href}
            className="group inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-[15px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {cta.isAuthenticated ? cta.label : "Start saving free"}
            <HugeiconsIcon icon={ArrowRightIcon} strokeWidth={2} className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <GithubStarButton variant="hero" label="Explore on GitHub" />
        </motion.div>

        <motion.p {...rise(0.28)} className="mt-5 text-sm text-muted-foreground">
          Free to start. Open source. Self-hostable.
        </motion.p>
      </div>

      <Switcher />
    </section>
  );
}
