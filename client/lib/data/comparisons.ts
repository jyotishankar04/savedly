import type { ComparisonSection, ComparisonValue } from "@/components/arc/blocks/comparison-table/comparison-table-data";

// Savedly beside other tools, for /vs and /vs/<slug>. Every cell has to be
// true and checkable: Savedly's from the product as it ships today (the vault
// is PIN-protected, not encrypted; there's no chat-app bot), competitors'
// from their own sites. Prices were checked in October 2026; recheck them
// before relying on one, and change PRICES_CHECKED when you do.

export const PRICES_CHECKED = "October 2026";

/** The rows every comparison shows, grouped. Each competitor fills in a value per row id. */
const ROWS = {
  saving: {
    title: "Saving",
    rows: [
      { id: "what", feature: "What it keeps" },
      { id: "reads", feature: "Files things for you", hint: "Tags and groups what you save without being asked" },
      { id: "chat", feature: "Save from a chat app", hint: "Send it something from WhatsApp or similar" },
    ],
  },
  finding: {
    title: "Finding it again",
    rows: [
      { id: "meaning", feature: "Search by meaning", hint: "Find it from a rough description" },
      { id: "graph", feature: "A map of how things connect" },
    ],
  },
  ownership: {
    title: "Privacy and ownership",
    rows: [
      { id: "vault", feature: "A locked place for private things" },
      { id: "sharing", feature: "Share with other people" },
      { id: "open", feature: "Open source" },
      { id: "selfhost", feature: "Run it on your own server" },
    ],
  },
} as const;

type RowId = (typeof ROWS)[keyof typeof ROWS]["rows"][number]["id"];

export interface Competitor {
  slug: string;
  name: string;
  /** What kind of tool it is, in a few words. */
  type: string;
  /** What it costs, in a few words, as of PRICES_CHECKED. */
  price: string;
  values: Record<RowId, ComparisonValue>;
  pickUsIf: string[];
  pickThemIf: string[];
  whereWeExcel: string;
  whereTheyExcel: string;
}

export const savedly = {
  name: "Savedly",
  price: "Free plan, or free to self-host",
  values: {
    what: "Links, notes, images, video, documents, voice",
    reads: { value: true, note: "Summaries, tags and collections" },
    chat: { value: "partial", note: "Share from any app on Android" },
    meaning: { value: true, note: "Alongside keyword search, and Ask" },
    graph: true,
    vault: { value: true, note: "PIN-protected" },
    sharing: { value: true, note: "Public, password or invite-only links" },
    open: { value: true, note: "AGPL-3.0" },
    selfhost: { value: true, note: "One command, with Docker" },
  } satisfies Record<RowId, ComparisonValue>,
};

export const competitors: Competitor[] = [
  {
    slug: "mymind",
    name: "mymind",
    type: "Visual memory tool",
    price: "Paid, from $6.99 a month",
    values: {
      what: "Links, images, articles, notes, screenshots",
      reads: true,
      chat: false,
      meaning: true,
      graph: false,
      vault: false,
      sharing: { value: false, note: "Private only" },
      open: false,
      selfhost: false,
    },
    pickUsIf: ["You want an open-source tool you can run yourself", "You want to share a collection with a link", "You want to ask questions of what you've saved and see the sources"],
    pickThemIf: ["You want a visual, mood-board style grid", "You never want anything you save to be shareable"],
    whereWeExcel: "Savedly gives you your data to keep, links you can share, and a map of how your saves connect.",
    whereTheyExcel: "mymind has a polished, visual-first grid that suits designers.",
  },
  {
    slug: "memorie",
    name: "Memorie",
    type: "AI second brain",
    price: "Paid plans",
    values: {
      what: "Links, reels, screenshots, voice, PDFs, text",
      reads: true,
      chat: { value: true, note: "WhatsApp and Instagram" },
      meaning: true,
      graph: false,
      vault: false,
      sharing: { value: "partial", note: "Limited" },
      open: false,
      selfhost: false,
    },
    pickUsIf: ["You want a full web app to save, search and browse in, on any device", "You want to own your data and be able to run it yourself"],
    pickThemIf: ["You save mostly by sending Reels through Instagram messages", "You want to send everything through WhatsApp today"],
    whereWeExcel: "A full dashboard, data you own, and search that combines meaning and exact words.",
    whereTheyExcel: "Memorie makes saving from Instagram and WhatsApp very easy.",
  },
  {
    slug: "fabric",
    name: "Fabric",
    type: "AI workspace",
    price: "Free plan and paid plans",
    values: {
      what: "Links, screenshots, documents, notes",
      reads: true,
      chat: { value: "partial", note: "Limited" },
      meaning: true,
      graph: { value: false, note: "A spatial canvas instead" },
      vault: false,
      sharing: { value: true, note: "Shared spaces" },
      open: false,
      selfhost: false,
    },
    pickUsIf: ["You want saving and finding to take one step, with nothing to arrange", "You prefer open source"],
    pickThemIf: ["You want a canvas to arrange notes on visually", "You want AI to draft documents for you"],
    whereWeExcel: "Simplicity. Savedly saves and indexes things straight away, with no canvas to lay out by hand.",
    whereTheyExcel: "Fabric works as a spatial knowledge base where you arrange things visually.",
  },
  {
    slug: "raindrop",
    name: "Raindrop.io",
    type: "Bookmark manager",
    price: "Free, or Pro at $28 a year",
    values: {
      what: "Links, PDFs, videos, files",
      reads: { value: "partial", note: "Mostly by hand, with AI suggestions" },
      chat: false,
      meaning: true,
      graph: false,
      vault: false,
      sharing: { value: true, note: "Public collections" },
      open: false,
      selfhost: false,
    },
    pickUsIf: ["You'd rather not sort and tag every link yourself", "You want what you save read and summarised for you"],
    pickThemIf: ["You enjoy organising links into deep folder trees", "You only need a bookmark manager"],
    whereWeExcel: "Savedly reads every save and files it into collections and tags for you, so there's nothing to sort by hand.",
    whereTheyExcel: "Raindrop has deep nested folders and thorough tools for organising by hand.",
  },
  {
    slug: "readwise-reader",
    name: "Readwise Reader",
    type: "Read-it-later app",
    price: "Paid, $119.88 a year",
    values: {
      what: "Articles, PDFs, newsletters, videos, posts",
      reads: { value: "partial", note: "Tags and filters" },
      chat: false,
      meaning: true,
      graph: false,
      vault: false,
      sharing: false,
      open: false,
      selfhost: false,
    },
    pickUsIf: ["You want one place for every kind of thing you save, not only reading", "You want to ask questions across everything you've saved"],
    pickThemIf: ["Highlighting what you read and reviewing it later is the main thing", "You read a lot of newsletters and ebooks"],
    whereWeExcel: "Savedly keeps anything, not only reading, and connects it all by meaning.",
    whereTheyExcel: "Readwise Reader is one of the best places to read and highlight.",
  },
  {
    slug: "notion",
    name: "Notion",
    type: "Workspace tool",
    price: "Free plan and paid plans",
    values: {
      what: "Pages, links, files, images, notes",
      reads: { value: "partial", note: "Mostly by hand" },
      chat: false,
      meaning: true,
      graph: false,
      vault: false,
      sharing: true,
      open: false,
      selfhost: false,
    },
    pickUsIf: ["You want to save something without filling in fields", "You want a tool only for keeping and finding things"],
    pickThemIf: ["You want to build your own databases", "You plan projects with a team"],
    whereWeExcel: "Saving is one step. There's no database to set up before you can keep a link.",
    whereTheyExcel: "Notion is endlessly flexible for wikis and team workflows.",
  },
  {
    slug: "evernote",
    name: "Evernote",
    type: "Digital notebook",
    price: "Free plan with limits, and paid plans",
    values: {
      what: "Notes, web pages, PDFs, images, audio",
      reads: { value: "partial", note: "Mostly by hand" },
      chat: false,
      meaning: true,
      graph: false,
      vault: false,
      sharing: true,
      open: false,
      selfhost: false,
    },
    pickUsIf: ["You want saving to be quick and organising to happen for you", "You want something light and new"],
    pickThemIf: ["You have years of notes in Evernote already", "You like notebooks and stacks"],
    whereWeExcel: "Savedly puts finding things first and organises for you, so there are no notebooks to keep up.",
    whereTheyExcel: "Evernote has a long history and rich formatting for writing notes.",
  },
  {
    slug: "google-keep",
    name: "Google Keep",
    type: "Note-taking app",
    price: "Free",
    values: {
      what: "Text, photos, audio, lists",
      reads: { value: "partial", note: "Labels you add" },
      chat: false,
      meaning: { value: "partial", note: "Mostly keyword search" },
      graph: false,
      vault: false,
      sharing: true,
      open: false,
      selfhost: false,
    },
    pickUsIf: ["You save whole web pages, documents and videos", "You want search that understands what you mean"],
    pickThemIf: ["You mostly jot down lists and short reminders", "You live in Google's apps"],
    whereWeExcel: "Savedly is built for rich things you want to find again, not only quick notes.",
    whereTheyExcel: "Google Keep is very fast for opening and typing a short reminder.",
  },
  {
    slug: "capacities",
    name: "Capacities",
    type: "Knowledge management app",
    price: "Free plan and paid plans",
    values: {
      what: "Notes, links, images, audio, files",
      reads: { value: "partial", note: "Object types you define" },
      chat: { value: true, note: "WhatsApp and Telegram" },
      meaning: true,
      graph: true,
      vault: false,
      sharing: true,
      open: false,
      selfhost: false,
    },
    pickUsIf: ["You don't want to define types and properties for what you save", "You want things sorted for you, without a schema"],
    pickThemIf: ["You like giving everything a type, such as Book or Meeting", "You think in objects and their properties"],
    whereWeExcel: "You never have to say what something is. Savedly saves it and works it out.",
    whereTheyExcel: "Capacities gives everything a structure, which is great if you want a schema.",
  },
  {
    slug: "glasp",
    name: "Glasp",
    type: "Social highlighter",
    price: "Free plan",
    values: {
      what: "Web highlights, PDFs, YouTube, Kindle",
      reads: { value: "partial", note: "Tags" },
      chat: false,
      meaning: true,
      graph: false,
      vault: false,
      sharing: { value: true, note: "Social by design" },
      open: false,
      selfhost: false,
    },
    pickUsIf: ["You want a private library, not a social feed", "You save files and notes, not only highlights"],
    pickThemIf: ["You want to see what others highlighted on the same page", "You enjoy a social feed of reading"],
    whereWeExcel: "Savedly is private by default, and the code that handles your data is public.",
    whereTheyExcel: "Glasp is a social network for readers and the passages they highlight.",
  },
  {
    slug: "tome",
    name: "ToMe",
    type: "Capture app for iPhone",
    price: "Free, with a Pro upgrade",
    values: {
      what: "Links, photos, notes, files, voice, places",
      reads: { value: "partial", note: "Spaces you organise" },
      chat: { value: "partial", note: "Share from any app on iPhone" },
      meaning: { value: "partial", note: "Search and Spotlight" },
      graph: false,
      vault: false,
      sharing: { value: true, note: "Shared Spaces on Pro" },
      open: false,
      selfhost: false,
    },
    pickUsIf: ["You use Windows, Linux or Android as well as Apple devices", "You want AI summaries and search by meaning"],
    pickThemIf: ["You only use iPhone and Mac", "You prefer to organise things into Spaces yourself"],
    whereWeExcel: "Savedly works in any browser, is open source, and does the organising for you.",
    whereTheyExcel: "ToMe is a well-made native Apple app that fits the iPhone share sheet.",
  },
];

/** The table's sections for Savedly beside one or more competitors. */
export function comparisonSections(against: Competitor[]): ComparisonSection[] {
  return Object.entries(ROWS).map(([id, section]) => ({
    id,
    title: section.title,
    rows: section.rows.map((row) => ({
      id: row.id,
      feature: row.feature,
      hint: "hint" in row ? row.hint : undefined,
      values: Object.fromEntries([["savedly", savedly.values[row.id]], ...against.map((c) => [c.slug, c.values[row.id]])]),
    })),
  }));
}
