// The Help Center's content registry. Everything the hub, the sidebar, search
// and the static routes show comes from here, so adding a page is one entry:
//   - a guide: append to GUIDES (slug becomes /help/<slug>)
//   - a tool that has its own page: append to TOOLS
//   - a new topic area: append to CATEGORIES and point entries at its id
// A new kind of content (say long-form articles) would add its own type here
// and its own route; the hub and search read the combined HELP_ENTRIES list.

export interface HelpStep {
  title: string;
  body: string;
  /** Optional screenshot; rendered under the step when present. */
  image?: { src: string; alt: string };
}

/** A button that takes the reader straight to where the guide's task happens. Shown on the guide page and by the Ask assistant. */
export interface HelpAction {
  label: string;
  href: string;
}

export interface HelpCategory {
  id: string;
  title: string;
  blurb: string;
}

export interface HelpGuide {
  kind?: "guide";
  id: string;
  slug: string;
  category: string;
  title: string;
  summary: string;
  intro: string;
  steps: HelpStep[];
  actions?: HelpAction[];
  /** Position within its category, lowest first. Entries without one keep registry order, after any that have one. */
  order?: number;
}

/** An entry with its own hand-built page: an interactive tool, or an article too rich for the step format (code blocks, tables). */
export interface HelpTool {
  kind: "tool" | "article";
  slug: string;
  category: string;
  title: string;
  summary: string;
  href: string;
  /** Position within its category, lowest first. Entries without one keep registry order, after any that have one. */
  order?: number;
}

export type HelpEntry = HelpGuide | HelpTool;

export const CATEGORIES: HelpCategory[] = [
  { id: "get-started", title: "Get started", blurb: "Set up and save your first memories." },
  { id: "find", title: "Organize and find", blurb: "Keep things tidy and get back to them fast." },
  { id: "ai", title: "Ask and AI", blurb: "The assistant, your AI key, and picking models." },
  { id: "self-host", title: "Self-hosting", blurb: "Run your own SaveForLatter on your own server." },
  { id: "share", title: "Share and protect", blurb: "Control who sees what." },
  { id: "stay", title: "Stay on top", blurb: "Calendar events and notifications." },
  { id: "account", title: "Account and tools", blurb: "Your data, settings and shortcuts." },
];

export const GUIDES: HelpGuide[] = [
  {
    id: "getting-started",
    slug: "getting-started",
    actions: [{ label: "Save something", href: "/app/capture" }, { label: "Connect an AI key", href: "/app/settings/ai" }],
    category: "get-started",
    summary: "From a new account to your first saved memory.",
    title: "Getting started",
    intro: "The shortest path from a new account to your first saved memory.",
    steps: [
      {
        title: "Create your account",
        body: "Sign up with Google or GitHub — no password to remember, and no card required at any point.",
      },
      {
        title: "Connect an AI key",
        body: "Head to Settings → AI and add a key from OpenAI, Anthropic, Groq, Google, or any OpenAI-compatible endpoint. This unlocks summaries, tags, and Ask. Saving, keyword search, and organizing manually all work immediately without this step.",
      },
      {
        title: "Save your first memory",
        body: "Paste a link, drop a file, or just type a note from the capture bar on your dashboard.",
      },
    ],
  },
  {
    id: "capture",
    slug: "capture",
    actions: [{ label: "Save something now", href: "/app/capture" }],
    category: "get-started",
    summary: "Save links, notes, images, documents and voice from one capture bar.",
    title: "Saving memories",
    intro: "Links, notes, images, documents, and voice all go through the same capture bar.",
    steps: [
      {
        title: "Save a link",
        body: "Paste a URL. The page is fetched, read, summarized, and tagged automatically once AI is configured.",
      },
      {
        title: "Save a note",
        body: "Type plain text — an idea, a quote, a reminder. Notes are yours as typed; nothing is rewritten, only lightly spelling-corrected if it's a caption alongside a link.",
      },
      {
        title: "Upload a file",
        body: "Images get OCR text extraction plus a visual description; PDFs get their text extracted (large ones are summarized from page one). Voice memos save today — automatic transcription is on the way.",
      },
    ],
  },
  {
    id: "organize",
    slug: "organize",
    actions: [{ label: "Open collections", href: "/app/collections" }, { label: "Browse tags", href: "/app/tags" }],
    category: "find",
    summary: "Collections group memories; tags cut across them.",
    title: "Organizing",
    intro: "Collections group memories into folders; tags cut across them however you like.",
    steps: [
      {
        title: "Let it organize itself",
        body: "With AI configured, an incoming memory can be auto-tagged and, if it fits a clear recurring theme, auto-filed into a matching collection.",
      },
      {
        title: "Create your own collection",
        body: "From the Collections page, give it a name, an icon, and an optional description.",
      },
      {
        title: "Tag anything, anytime",
        body: "Add or edit tags on any memory to group things your own way — tags aren't tied to a single collection.",
      },
    ],
  },
  {
    id: "search",
    slug: "search",
    actions: [{ label: "Open search", href: "/app/search" }],
    category: "find",
    summary: "Keyword and meaning-based search, with filters.",
    title: "Search",
    intro: "Two search legs run together and get merged into one ranked list.",
    steps: [
      {
        title: "Keyword search",
        body: "Works immediately for every account, no setup — matches the actual words in what you saved.",
      },
      {
        title: "Semantic search",
        body: "Matches by meaning, not just words — \"that pricing page\" can find it even without the word \"pricing\" anywhere on it. This is powered by embeddings, which SaveForLatter covers by default at no cost to you, so it works out of the box.",
      },
      {
        title: "Filter your results",
        body: "Narrow by type, collection, tag, or a date range from the search page's filter bar.",
      },
    ],
  },
  {
    id: "ask",
    slug: "ask",
    actions: [{ label: "Open Ask", href: "/app/ask" }],
    category: "ai",
    summary: "A chat assistant that answers from, and acts on, what you've saved.",
    title: "Ask SaveForLatter",
    intro: "A chat assistant over your saved content — and, now, over your account itself.",
    steps: [
      {
        title: "Connect a reasoning model",
        body: "Settings → AI → assign a key to the \"Reasoning\" role. This is the one role Ask actually needs to produce a real reply.",
      },
      {
        title: "Ask a question",
        body: "Open the full Ask page, or use the floating button available from every page except Ask itself.",
      },
      {
        title: "Let it act, not just answer",
        body: "Ask it to save a note, edit a memory's title or tags, file something into a collection, or delete something — it can carry these out directly now, not just search and report back.",
      },
      {
        title: "Popup or sidebar, your choice",
        body: "The floating widget can float near the corner or dock as a full-height sidebar — toggle it from the widget's own header, and both position and size are remembered next time.",
      },
    ],
  },
  {
    id: "ai-setup",
    slug: "ai-setup",
    actions: [{ label: "Open AI settings", href: "/app/settings/ai" }, { label: "Choose your models", href: "/help/model-selection" }],
    category: "self-host",
    // Come after the install guide below — GUIDES render before TOOLS within
    // a category by default, which would otherwise put "set up AI" ahead of
    // "install it" for the one category where a tool needs to lead.
    order: 1,
    summary: "On a self-hosted install, add your own AI key and assign it to each job.",
    title: "Setting up AI on a self-hosted install",
    intro: "On the hosted plans we supply the AI, so there's nothing to set up. On a self-hosted install, each account brings its own key, used only for that account (or the admin sets one up for everyone).",
    steps: [
      {
        title: "Add a provider key",
        body: "Settings → AI → Add key. Pick OpenAI, Anthropic, Groq, Google, or a custom OpenAI-compatible endpoint (OpenRouter, Together, a local Ollama instance, etc.), give it a label, and paste the API key. It's encrypted at rest.",
      },
      {
        title: "Assign it to a role",
        body: "Fast (tagging/classification), Reasoning (Ask), Vision (image analysis), and Embeddings (search) are each configured separately — the same key can power more than one role, or you can mix providers across roles.",
        image: { src: "/help/choose-models.png", alt: "The model chooser suggesting one model for each role: Fast, Reasoning, Vision and Embeddings" },
      },
      {
        title: "Save — it's tested live",
        body: "Every role assignment is verified against the real provider before it's saved, so a bad key or a mistyped model name is caught immediately, not the next time you try to use it.",
      },
    ],
  },
  {
    id: "share",
    slug: "share",
    actions: [{ label: "Shared with me", href: "/app/shared" }],
    category: "share",
    summary: "Share a memory or collection with the level of control you want.",
    title: "Sharing",
    intro: "Share a single memory or a whole collection, with as much or as little control as you want.",
    steps: [
      {
        title: "Turn on a link",
        body: "From a memory or collection's share menu, choose a mode: public, password-protected, or invite-only with access requests.",
      },
      {
        title: "Invite someone directly",
        body: "Add their email. If they don't have an account yet, access is granted automatically the moment they sign up with that address.",
      },
      {
        title: "Manage access anytime",
        body: "Revoke one person's access, or turn the link off entirely, from the same share panel — nothing is permanent.",
      },
    ],
  },
  {
    id: "vault",
    slug: "vault",
    actions: [{ label: "Open Vault", href: "/app/vault" }],
    category: "share",
    summary: "A PIN-gated space for memories you'd rather keep out of view.",
    title: "Vault",
    intro: "A PIN-gated space for memories you'd rather keep out of your regular views.",
    steps: [
      {
        title: "Set a PIN",
        body: "The first time you open the Vault, you'll be asked to set a PIN for it.",
      },
      {
        title: "Move something in",
        body: "From any memory or collection's menu, choose \"Move to Vault\" — it disappears from your normal views immediately.",
      },
      {
        title: "Unlock to view",
        body: "Enter your PIN to see Vault contents; it locks again automatically the moment the tab loses focus. Worth knowing: this is PIN-gated access control, not end-to-end encryption of the content itself.",
      },
    ],
  },
  {
    id: "calendar",
    slug: "calendar",
    actions: [{ label: "Open calendar", href: "/app/calendar" }, { label: "Connect a calendar", href: "/app/integrations" }],
    category: "stay",
    summary: "Turn date-bound memories into real calendar events.",
    title: "Calendar",
    intro: "Connect a calendar so date-bound memories can become real events.",
    steps: [
      {
        title: "Connect a calendar",
        body: "Settings → Integrations → connect Google Calendar or Outlook.",
      },
      {
        title: "Let AI catch events",
        body: "With AI configured, a saved memory that reads like an appointment or deadline gets flagged, with a one-click option to push it to your connected calendar.",
      },
      {
        title: "Or just ask",
        body: "Tell Ask SaveForLatter directly — \"add a meeting with Alex tomorrow at 3pm\" — and it's created and synced without opening a separate form.",
      },
    ],
  },
  {
    id: "import",
    slug: "import",
    actions: [{ label: "Import bookmarks", href: "/app/import" }],
    category: "get-started",
    summary: "Bring in the bookmarks you already have.",
    title: "Importing",
    intro: "Bring in what you've already bookmarked elsewhere, all at once.",
    steps: [
      {
        title: "Export your bookmarks",
        body: "From your browser's bookmark manager, export them as an HTML file — every major browser supports this.",
      },
      {
        title: "Upload it",
        body: "From the Import page, upload that file — or skip it and paste in a plain list of URLs instead.",
      },
      {
        title: "Let it process",
        body: "Each link is saved and queued for the same enrichment as anything saved directly, one by one.",
      },
    ],
  },
  {
    id: "extension",
    slug: "extension",
    category: "get-started",
    summary: "Save the page you're on without leaving it.",
    title: "Browser extension",
    intro: "Save the page you're on without leaving it.",
    steps: [
      {
        title: "Install and sign in",
        body: "Add the Chrome extension, then sign in to the web app in the same browser — the extension picks up your session automatically, so there's nothing to log in to twice.",
      },
      {
        title: "Save from the popup",
        body: "Click the toolbar icon to capture the current tab, or use the right-click menu on a page, link, or selection.",
      },
      {
        title: "Use the shortcut",
        body: "Press Ctrl+Shift+S (Cmd+Shift+S on Mac) to quick-save the current page in one keystroke.",
      },
    ],
  },
  {
    id: "library",
    slug: "library",
    actions: [{ label: "Favorites", href: "/app/favorites" }, { label: "Archive", href: "/app/archive" }, { label: "Trash", href: "/app/trash" }],
    category: "find",
    summary: "Set things aside without losing them.",
    title: "Favorites, Archive & Trash",
    intro: "Three ways to set a memory aside without losing it.",
    steps: [
      {
        title: "Star your favorites",
        body: "Star a memory to pin it to the Favorites page for quick access.",
      },
      {
        title: "Archive what you're done with",
        body: "Archive a memory from its detail page to keep it out of your active views. It's still searchable and can be restored anytime.",
      },
      {
        title: "Trash is a safety net",
        body: "Deleted memories sit in Trash for 15 days before they're permanently removed. Restore one before then and it comes back exactly as it was.",
      },
    ],
  },
  {
    id: "explore",
    slug: "explore",
    actions: [{ label: "Explore", href: "/app/explore" }, { label: "Memory graph", href: "/app/graph" }, { label: "Insights", href: "/app/insights" }],
    category: "find",
    summary: "Rediscover what you've saved with Explore, the graph and Insights.",
    title: "Explore & memory graph",
    intro: "Rediscover what you've already saved.",
    steps: [
      {
        title: "Browse Explore",
        body: "The Explore page surfaces ways back into your library, so older saves don't just sink out of sight.",
      },
      {
        title: "See how memories connect",
        body: "The graph view maps related memories to each other — select a memory to highlight everything it's connected to.",
      },
      {
        title: "Check your Insights",
        body: "Insights shows your top tags, what kinds of things you save, which sites your links come from, and how you save.",
      },
    ],
  },
  {
    id: "notifications",
    slug: "notifications",
    actions: [{ label: "Open notifications", href: "/app/notifications" }],
    category: "stay",
    summary: "One feed for anything that needs your attention.",
    title: "Notifications",
    intro: "One feed for anything that needs your attention.",
    steps: [
      {
        title: "Open the feed",
        body: "Go to Notifications from the sidebar. Unread items are marked until you open them.",
      },
      {
        title: "What shows up",
        body: "Share invites and access requests, plus events the AI spots in something you saved (with AI configured).",
      },
      {
        title: "Act from the notification",
        body: "Approve or deny an access request right from the item. Event notifications tell you when the AI spots something date-bound in a memory.",
      },
    ],
  },
  {
    id: "shortcuts",
    slug: "shortcuts",
    category: "account",
    summary: "Keyboard shortcuts for search, capture and navigation.",
    title: "Keyboard shortcuts",
    intro: "Everything below works anywhere in the dashboard. Use Cmd instead of Ctrl on Mac.",
    steps: [
      {
        title: "Search and capture",
        body: "Ctrl+K opens the search palette. Ctrl+Q opens Quick Capture, and Ctrl+Enter submits it.",
      },
      {
        title: "Move around",
        body: "Ctrl+B collapses or expands the sidebar. Ctrl+M opens the quick-nav menu when the sidebar is collapsed.",
      },
      {
        title: "Browser-reserved keys",
        body: "Ctrl+N (Notifications) and Ctrl+P (Profile) are also bound, but most browsers claim them first for new window and print — use the sidebar instead there.",
      },
    ],
  },
  {
    id: "account",
    slug: "account",
    actions: [{ label: "Open settings", href: "/app/settings" }, { label: "Privacy & data", href: "/app/settings/privacy" }],
    category: "account",
    summary: "Profile, appearance, your data, and what's free.",
    title: "Account & settings",
    intro: "Where your profile, your data, and the honest truth about pricing all live.",
    steps: [
      {
        title: "Update your profile & appearance",
        body: "Settings → Account for your profile, Settings → Appearance for theme and accent color.",
      },
      {
        title: "Export or delete your data",
        body: "Settings → Privacy & Data → export everything you've saved as JSON, or as an Open Knowledge Format (OKF) folder of Markdown files that any AI agent can read. You can also permanently delete your account there.",
      },
      {
        title: "Check your plan and usage",
        body: "Settings → Plan & usage shows your plan, how much of each limit you've used, and how much included AI is left this month. Lite and Pro add more room, more AI and features like the private vault and bulk actions. To upgrade, pick a plan there; to change or cancel a paid plan, click Manage billing. Adding your own AI key in Settings → AI removes the AI limits.",
      },
    ],
  },
];

export const TOOLS: HelpTool[] = [
  {
    kind: "article",
    slug: "self-host",
    category: "self-host",
    order: 0,
    title: "Self-host SaveForLatter",
    summary: "Install with one command, create the admin account, connect storage, email and sign-in, back up and upgrade.",
    href: "/help/self-host",
  },
  {
    kind: "tool",
    slug: "model-selection",
    category: "ai",
    title: "Choose your AI models",
    summary: "Compare every model with live prices, and get a suggestion for each job.",
    href: "/help/model-selection",
  },
];

export const HELP_ENTRIES: HelpEntry[] = [...GUIDES, ...TOOLS];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);
export const categoryById = (id: string) => CATEGORIES.find((c) => c.id === id);
export const isGuide = (e: HelpEntry): e is HelpGuide => !("href" in e);
export const entryHref = (e: HelpEntry) => (isGuide(e) ? `/help/${e.slug}` : e.href);

/** Entries grouped in category order, each group in registry order. */
export function entriesByCategory(): { category: HelpCategory; entries: HelpEntry[] }[] {
  return CATEGORIES.map((category) => ({
    category,
    // A stable sort: entries that share an order (almost all of them, implicitly
    // tied at the end) keep their registry position relative to each other.
    entries: HELP_ENTRIES.filter((e) => e.category === category.id).sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity)),
  })).filter((g) => g.entries.length > 0);
}

/** Reading order across the guides, used for previous/next links. */
export function guideNeighbors(slug: string): { prev?: HelpGuide; next?: HelpGuide } {
  const ordered = entriesByCategory().flatMap((g) => g.entries).filter(isGuide);
  const i = ordered.findIndex((g) => g.slug === slug);
  return { prev: i > 0 ? ordered[i - 1] : undefined, next: i >= 0 && i < ordered.length - 1 ? ordered[i + 1] : undefined };
}

export interface SearchHit {
  entry: HelpEntry;
  /** The step that matched best, when the match was inside a guide's steps. */
  step?: HelpStep;
  score: number;
}

/** Every word must match somewhere; title and summary weigh more than step text. */
export function searchHelp(query: string): SearchHit[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const hits: SearchHit[] = [];
  for (const entry of HELP_ENTRIES) {
    const title = entry.title.toLowerCase();
    const summary = entry.summary.toLowerCase();
    const guide = isGuide(entry) ? entry : undefined;
    let score = 0;
    let step: HelpStep | undefined;
    let stepScore = 0;
    let all = true;
    for (const w of words) {
      let s = 0;
      if (title.includes(w)) s += 6;
      if (summary.includes(w)) s += 3;
      if (guide?.intro.toLowerCase().includes(w)) s += 2;
      for (const st of guide?.steps ?? []) {
        const inTitle = st.title.toLowerCase().includes(w);
        const inBody = st.body.toLowerCase().includes(w);
        if (inTitle || inBody) {
          s += inTitle ? 3 : 1;
          const local = (inTitle ? 3 : 1) + (step === st ? 1 : 0);
          if (local >= stepScore) {
            stepScore = local;
            step = st;
          }
        }
      }
      if (s === 0) {
        all = false;
        break;
      }
      score += s;
    }
    if (all) hits.push({ entry, step: score > 0 && guide ? step : undefined, score });
  }
  return hits.sort((a, b) => b.score - a.score);
}
