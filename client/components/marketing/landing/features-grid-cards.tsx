"use client";

import { MessageCircleQuestion, Search, Network, LockKeyhole, Layers, CalendarClock, Route, Globe as GlobeLucide, BarChart3, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { HugeiconsIcon } from "@hugeicons/react";
import { Type as KeywordIcon } from "lucide-react";
import { SparklesIcon as MeaningIcon, ChromeIcon, Upload01Icon as Upload } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { MEMORY_TYPE_ICONS } from "@/lib/memory-icons";
import { AskPreviewCard } from "@/components/marketing/landing/ask-preview-card";
import { GraphPreviewCard } from "@/components/marketing/landing/graph-preview-card";
import { VaultDemoCard } from "@/components/marketing/landing/vault-demo-card";

// No screenshot tool is available in this session, so "a screenshot of the
// UI" for each card is real UI instead of a photo of it: three of the six
// visuals below are the exact live/interactive components used elsewhere
// on this site (drag the graph, switch tabs on the vault card — both
// genuinely respond), and the other three are small frozen snippets built
// from the same real primitives (Badge, MEMORY_TYPE_ICONS, the actual
// Google/Microsoft logos) rather than invented ones.
interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  visual: React.ReactNode;
}

function MiniSearchResults() {
  return (
    <div className="flex w-full flex-col gap-1.5 p-3">
      {[
        { type: "video" as const, title: "Building a 6-bay ZFS NAS", legs: ["Keyword", "Meaning"] },
        { type: "web" as const, title: "Synology vs. self-built TrueNAS", legs: ["Meaning"] },
      ].map((r) => (
        <div key={r.title} className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
            <HugeiconsIcon icon={MEMORY_TYPE_ICONS[r.type]} strokeWidth={2.25} className="h-3 w-3" />
          </span>
          <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-foreground">{r.title}</span>
          <div className="flex shrink-0 gap-1">
            {r.legs.map((leg) => (
              <Badge key={leg} variant="secondary" className="gap-0.5 px-1.5 text-[8px]">
                {leg === "Keyword" ? <KeywordIcon className="h-2 w-2" /> : <HugeiconsIcon icon={MeaningIcon} strokeWidth={2.25} className="h-2 w-2" />}
                {leg}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniFormatChips() {
  const chips: { type: keyof typeof MEMORY_TYPE_ICONS; label: string }[] = [
    { type: "web", label: "Article" },
    { type: "video", label: "Video" },
    { type: "voice", label: "Voice memo" },
    { type: "document", label: "PDF" },
    { type: "note", label: "Note" },
    { type: "image", label: "Screenshot" },
  ];
  return (
    <div className="flex flex-wrap content-start items-start gap-1.5 p-3">
      {chips.map((chip) => (
        <span
          key={chip.type}
          className="flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground/85"
        >
          <HugeiconsIcon icon={MEMORY_TYPE_ICONS[chip.type]} strokeWidth={2.25} className="h-3 w-3 text-primary" />
          {chip.label}
        </span>
      ))}
    </div>
  );
}

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.1-11.3-7.5l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.2 5.2C39.9 36.9 44 31 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}

function MicrosoftLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 21 21" className={className} aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

function MiniIntegrations() {
  return (
    <div className="flex w-full items-center justify-center gap-3 p-3">
      {[
        { Logo: GoogleLogo, label: "Google Calendar" },
        { Logo: MicrosoftLogo, label: "Microsoft Outlook" },
      ].map(({ Logo, label }) => (
        <div key={label} className="flex flex-1 flex-col items-center gap-2 rounded-xl border border-border bg-background px-3 py-4">
          <Logo className="h-6 w-6" />
          <span className="text-center text-[10px] font-medium text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}

function MiniPipelineSteps() {
  const steps = ["In", "Read", "Understood", "Connected"];
  return (
    <div className="flex h-full w-full items-center justify-center gap-1 p-3">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-1">
          <span className="rounded-full border border-border bg-background px-2 py-1 text-[10px] font-medium whitespace-nowrap text-foreground/85">
            {step}
          </span>
          {i < steps.length - 1 && <span className="h-px w-2 shrink-0 bg-border" />}
        </div>
      ))}
    </div>
  );
}

function MiniCaptureSurfaces() {
  const surfaces: { label: string; soon: boolean; render: () => React.ReactNode }[] = [
    { label: "Web", soon: false, render: () => <GlobeLucide className="h-3.5 w-3.5 text-primary" strokeWidth={2.25} /> },
    { label: "Import", soon: false, render: () => <HugeiconsIcon icon={Upload} strokeWidth={2.25} className="h-3.5 w-3.5 text-primary" /> },
    { label: "Extension", soon: true, render: () => <HugeiconsIcon icon={ChromeIcon} strokeWidth={2.25} className="h-3.5 w-3.5 text-primary" /> },
  ];
  return (
    <div className="grid h-full w-full grid-cols-2 gap-1.5 p-3">
      {surfaces.map((s) => (
        <div key={s.label} className="flex flex-col items-center justify-center gap-1 rounded-lg border border-border bg-background py-2">
          {s.render()}
          <span className="text-[9px] font-medium text-foreground/85">{s.label}</span>
          {s.soon && (
            <Badge variant="secondary" className="px-1 text-[7px] tracking-wide uppercase">
              Soon
            </Badge>
          )}
        </div>
      ))}
    </div>
  );
}

function MiniActivityGrid() {
  // A small fixed pattern standing in for the real activity heatmap
  // (components/ui/github-activity.tsx, used on the real /app/insights
  // page) — that component needs a 320px+ minimum width to render its
  // month labels and tooltips, too wide for this card's slot, so this is
  // a simplified look-alike rather than the real component at a size it
  // wasn't built for.
  const pattern = [1, 3, 0, 2, 4, 1, 0, 3, 2, 0, 1, 4, 2, 3, 0, 1, 2, 4, 0, 3, 1, 2, 0, 4, 3, 1, 0, 2];
  return (
    <div className="flex h-full w-full flex-col justify-center gap-2 p-3">
      <div className="grid grid-cols-7 gap-1">
        {pattern.map((level, i) => (
          <span
            key={i}
            className="h-2.5 w-2.5 rounded-[2px]"
            style={{ backgroundColor: level === 0 ? "var(--muted)" : `color-mix(in oklch, var(--primary) ${level * 25}%, var(--muted))` }}
          />
        ))}
      </div>
      <p className="text-[10px] font-medium text-muted-foreground">146 memories · saved most on Tuesdays</p>
    </div>
  );
}

const FEATURES: Feature[] = [
  {
    icon: MessageCircleQuestion,
    title: "Ask, with receipts",
    description: "Every answer points back to the memory it came from — ask in plain English, get something you can check.",
    visual: <AskPreviewCard className="w-full max-w-none scale-[0.82] origin-top" />,
  },
  {
    icon: Search,
    title: "Search both ways",
    description: "The exact word, or just the gist — both get searched, and results found either way rank together.",
    visual: <MiniSearchResults />,
  },
  {
    icon: Network,
    title: "Your library has a shape",
    description: "Related by meaning, by tag, or by collection — drag it around, nothing you save sits alone.",
    visual: <GraphPreviewCard className="relative h-full w-full overflow-hidden" showLegend={false} />,
  },
  {
    icon: LockKeyhole,
    title: "A real lock, not a toggle",
    description: "PIN-protected. Switch tabs and come back — this one's live, not a screenshot of one.",
    visual: <VaultDemoCard className="w-full max-w-none scale-[0.82] origin-top" />,
  },
  {
    icon: Layers,
    title: "Whatever it is, it goes in",
    description: "Links, videos, notes, images, documents, voice — one box reads all of it.",
    visual: <MiniFormatChips />,
  },
  {
    icon: CalendarClock,
    title: "Plays well with your calendar",
    description: "Push a detected event straight to Google Calendar or Outlook — no copying it over by hand.",
    visual: <MiniIntegrations />,
  },
  {
    icon: Route,
    title: "One pipeline, every save",
    description: "Read, summarized, tagged, and embedded — the same four steps happen automatically, whatever you send in.",
    visual: <MiniPipelineSteps />,
  },
  {
    icon: GlobeLucide,
    title: "Wherever you already are",
    description: "The dashboard and bulk import work today — the browser extension is on the way.",
    visual: <MiniCaptureSurfaces />,
  },
  {
    icon: BarChart3,
    title: "What you've actually been keeping",
    description: "An activity heatmap, top tags, and the categories your AI assistant inferred — a shape for your whole library.",
    visual: <MiniActivityGrid />,
  },
];

export function FeaturesGridCards() {
  return (
    <div className="px-6 py-20">
      <div className="mx-auto w-full max-w-(--breakpoint-lg)">
        <h2 className="text-pretty text-center font-medium text-4xl tracking-tight text-foreground">
          What makes it different
        </h2>
        <p className="mt-3 text-center text-lg text-muted-foreground tracking-[-0.01em] md:text-2xl">
          Every claim above, made real — try one before you take it on faith.
        </p>
        <div className="mx-auto mt-18 grid w-full gap-x-6 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="flex flex-col overflow-hidden rounded-xl pb-0 shadow-none">
              <CardHeader>
                <feature.icon className="h-5 w-5 text-primary" strokeWidth={2.25} />
                <h4 className="mt-3! font-medium text-xl tracking-[-0.01em] text-foreground">{feature.title}</h4>
                <p className="text-[17px] text-muted-foreground">{feature.description}</p>
              </CardHeader>
              <CardContent className="mt-auto px-0 pb-0">
                {/* ring, not border-t/border-l — checked app/globals.css:
                    --border matches --card exactly in dark mode, so a
                    border-colored edge here can render invisible depending
                    on what's composited underneath. ring-foreground/10
                    doesn't depend on that token relationship. */}
                <div className="ml-6 h-40 overflow-hidden rounded-tl-xl bg-muted/40 ring-1 ring-inset ring-foreground/10">
                  {feature.visual}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FeaturesGridCards;
