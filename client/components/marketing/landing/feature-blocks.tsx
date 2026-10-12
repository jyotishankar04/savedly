"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  AiMagicIcon as MeaningIcon,
  BubbleChatIcon as AskIcon,
  Calendar03Icon as CalendarIcon,
  CheckmarkCircle02Icon as ConfirmIcon,
  Copy01Icon as DuplicateIcon,
  FilterIcon,
  FolderLibraryIcon as OrganizeIcon,
  Image01Icon as ImageIcon,
  QuoteUpIcon as SourcesIcon,
  Search01Icon as SearchIcon,
  Tag01Icon as TagIcon,
  TextIcon as WordsIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { FeatureBlock } from "@/components/marketing/landing/feature-block";

// The three things Savedly is for, each as a scroll-driven block. Every
// picture is the real interface drawn small, with the same fictional library
// as the hero and the Help Center.

/** The white card each picture sits in, with a soft halo against the colour behind it. */
function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("w-full max-w-[340px] rounded-2xl bg-card p-5 shadow-2xl shadow-black/10 ring-4 ring-white/40 dark:ring-white/10", className)}>{children}</div>;
}

const ROW = "flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5";
const BADGE = "shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary";

function Query({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 ring-1 ring-primary/40">
      <HugeiconsIcon icon={SearchIcon} strokeWidth={2} className="h-4 w-4 shrink-0 text-primary" />
      <span className="truncate text-[13px] text-foreground">{children}</span>
    </div>
  );
}

function Result({ title, meta, badge }: { title: React.ReactNode; meta: string; badge?: string }) {
  return (
    <div className={ROW}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-foreground">{title}</p>
        <p className="truncate text-[11px] text-muted-foreground">{meta}</p>
      </div>
      {badge && <span className={BADGE}>{badge}</span>}
    </div>
  );
}

// ---- Search

function MeaningPicture() {
  return (
    <Card className="space-y-2.5">
      <Query>how much water for bread dough</Query>
      <Result title="Sourdough hydration, explained" meta="breadnotes.example" badge="Matched by meaning" />
      <Result title="Sourdough starter feeding schedule" meta="Note" />
    </Card>
  );
}

function WordsPicture() {
  return (
    <Card className="space-y-2.5">
      <Query>tram 28</Query>
      <Result
        title="Lisbon trip plan"
        meta={"Take tram 28 early, before the queues"}
        badge="Exact words"
      />
      <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
        …stay in Alfama. Take <mark className="rounded bg-primary/15 px-0.5 text-foreground">tram 28</mark> early before the queues. Day trip to Sintra…
      </p>
    </Card>
  );
}

function FiltersPicture() {
  const filters = [
    ["All", false],
    ["Websites", false],
    ["Notes", true],
    ["Images", false],
    ["Files", false],
  ] as const;
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {filters.map(([name, on]) => (
          <span key={name} className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium", on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
            {name}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">Collection: Travel</span>
        <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">Favorites</span>
      </div>
      <Result title="Bengaluru flight checklist" meta="Note · Travel" />
      <Result title="Lisbon trip plan" meta="Note · Travel" />
    </Card>
  );
}

function InsidePicture() {
  return (
    <Card>
      <div className="flex gap-3">
        <div className="flex h-20 w-24 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 to-indigo-200 dark:from-sky-400/30 dark:to-indigo-400/30">
          <HugeiconsIcon icon={ImageIcon} strokeWidth={1.75} className="h-7 w-7 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-foreground">Screenshot</p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Text found inside</p>
          <p className="mt-1 text-[12px] leading-relaxed text-foreground">Tram 28 timetable. First departure 06:00, every 9 minutes.</p>
        </div>
      </div>
      <div className="mt-4">
        <Query>tram timetable</Query>
      </div>
    </Card>
  );
}

// ---- Ask

function AnswerPicture() {
  return (
    <Card className="space-y-3">
      <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-[13px] text-primary-foreground">What did I save about sourdough?</p>
      <p className="text-[13px] leading-relaxed text-foreground">
        Two things. A guide saying to start at <span className="font-semibold">65 to 70% hydration</span>, and your own note to feed the starter{" "}
        <span className="font-semibold">once a day</span>.
      </p>
    </Card>
  );
}

function SourcesPicture() {
  return (
    <Card>
      <p className="text-[13px] leading-relaxed text-foreground">Your dentist appointment is on Thursday at 4:30 pm, with Dr. Rao.</p>
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">From your library</p>
      <div className="mt-2 space-y-2">
        <Result title="Dentist appointment on Thursday" meta="Note · Health" />
      </div>
    </Card>
  );
}

function ConfirmPicture() {
  return (
    <Card>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Nothing has changed yet</p>
      <p className="mt-1.5 text-[14px] font-medium text-foreground">Move &ldquo;Old grocery list&rdquo; to Trash</p>
      <div className="mt-4 flex gap-2">
        <span className="rounded-full bg-primary px-3.5 py-1.5 text-[12px] font-semibold text-primary-foreground">Yes, do it</span>
        <span className="rounded-full px-3.5 py-1.5 text-[12px] font-semibold text-foreground ring-1 ring-foreground/15">Cancel</span>
      </div>
    </Card>
  );
}

// ---- Organize

function CollectionsPicture() {
  const collections = [
    ["Recipes", "🍞", 2],
    ["Travel", "✈️", 2],
    ["Health", "🦷", 2],
    ["Reading", "📚", 2],
  ] as const;
  return (
    <Card>
      <div className="grid grid-cols-2 gap-2.5">
        {collections.map(([name, emoji, count]) => (
          <div key={name} className="rounded-xl bg-muted/60 p-3">
            <div className="flex items-start justify-between">
              <span className="text-2xl font-semibold tabular-nums text-foreground">{count}</span>
              <span className="text-base">{emoji}</span>
            </div>
            <p className="mt-2 text-[12px] font-medium text-muted-foreground">{name}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SummaryPicture() {
  return (
    <Card>
      <p className="text-[14px] font-semibold text-foreground">Home NAS setup guide</p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">Two mirrored drives, nightly snapshots, and a weekly off-site copy. Test a restore every few months.</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {["backup", "homelab", "storage"].map((tag) => (
          <span key={tag} className={BADGE}>
            {tag}
          </span>
        ))}
      </div>
    </Card>
  );
}

function EventPicture() {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-muted/70">
          <span className="text-[9px] font-semibold uppercase leading-none tracking-wider text-primary">Oct</span>
          <span className="mt-0.5 text-lg font-semibold leading-none tabular-nums text-foreground">15</span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-foreground">Dentist appointment</p>
          <p className="text-[11px] text-muted-foreground">Thu, 4:30 – 5:30 pm</p>
        </div>
      </div>
      <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-[12px] font-semibold text-primary-foreground">
        <HugeiconsIcon icon={CalendarIcon} strokeWidth={2.25} className="h-3.5 w-3.5" />
        Add to calendar
      </span>
    </Card>
  );
}

function DuplicatePicture() {
  return (
    <Card>
      <p className="text-[14px] font-semibold text-foreground">Duplicate detected</p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">&ldquo;Sourdough hydration, explained&rdquo; is already in your library, saved on 13 Oct.</p>
      <div className="mt-4 flex gap-2">
        <span className="rounded-full bg-primary px-3.5 py-1.5 text-[12px] font-semibold text-primary-foreground">Skip</span>
        <span className="rounded-full px-3.5 py-1.5 text-[12px] font-semibold text-foreground ring-1 ring-foreground/15">Add anyway</span>
      </div>
    </Card>
  );
}

export function FeatureBlocks() {
  return (
    <>
      <FeatureBlock
        id="search"
        label="Search"
        labelIcon={SearchIcon}
        title="A better way to find what you saved"
        tone="from-sky-300 via-blue-300 to-blue-700 dark:from-sky-500/50 dark:via-blue-600/50 dark:to-blue-950"
        items={[
          { icon: MeaningIcon, title: "Search by meaning", body: "Describe it roughly, in your own words. A half-remembered idea is enough to find the right thing.", Picture: MeaningPicture },
          { icon: WordsIcon, title: "Or by the exact words", body: "When you do remember the phrase, it finds that too. Both kinds of match are ranked together in one list.", Picture: WordsPicture },
          { icon: FilterIcon, title: "Narrow it down", body: "Filter by type, tag, collection or favorites when you know roughly where it lives.", Picture: FiltersPicture },
          { icon: ImageIcon, title: "Inside images and PDFs", body: "Text in a screenshot or a document is read when you save it, so you can search for what it says.", Picture: InsidePicture },
        ]}
      />
      <FeatureBlock
        id="ask"
        flip
        label="Ask"
        labelIcon={AskIcon}
        title="Ask your library a question"
        tone="from-violet-300 via-indigo-300 to-indigo-700 dark:from-violet-500/50 dark:via-indigo-600/50 dark:to-indigo-950"
        items={[
          { icon: AskIcon, title: "Answers from what you saved", body: "Ask in plain words and get a plain answer, drawn from your own library and not from the wider internet.", Picture: AnswerPicture },
          { icon: SourcesIcon, title: "Shows where it came from", body: "Every answer lists the memories it used, so you can open the original and check.", Picture: SourcesPicture },
          { icon: ConfirmIcon, title: "Asks before it acts", body: "It can tidy up for you, but deleting, bulk edits and calendar changes wait for your yes.", Picture: ConfirmPicture },
        ]}
      />
      <FeatureBlock
        id="organize"
        label="Organize"
        labelIcon={OrganizeIcon}
        title="Organized without the filing"
        tone="from-teal-200 via-cyan-300 to-sky-700 dark:from-teal-500/50 dark:via-cyan-600/50 dark:to-sky-950"
        items={[
          { icon: OrganizeIcon, title: "Collections that fill themselves", body: "Each save is filed by what it's about. You can rename, move or make your own at any time.", Picture: CollectionsPicture },
          { icon: TagIcon, title: "A summary and tags on every save", body: "So a year from now you can tell what something is without opening it.", Picture: SummaryPicture },
          { icon: CalendarIcon, title: "Dates become events", body: "A date in a note is spotted and offered to you as a calendar event, in your own time zone.", Picture: EventPicture },
          { icon: DuplicateIcon, title: "Duplicates caught", body: "Save something twice and Savedly tells you, with the choice to skip it or keep both.", Picture: DuplicatePicture },
        ]}
      />
    </>
  );
}
