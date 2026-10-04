// The Help Center hub's own registry. The step-by-step guides are MDX pages
// in content/docs (see lib/help-docs.ts and lib/source.ts); this file keeps
// only what the hub itself shows: the topic cards, and the interactive
// tools that have their own page under /help.

export interface HelpCategory {
  id: string;
  title: string;
  blurb: string;
}

/** An interactive tool with its own page on the hub. */
export interface HelpTool {
  slug: string;
  category: string;
  title: string;
  summary: string;
  href: string;
}

export const CATEGORIES: HelpCategory[] = [
  { id: "get-started", title: "Get started", blurb: "Set up and save your first memories." },
  { id: "find", title: "Organize and find", blurb: "Keep things tidy and get back to them fast." },
  { id: "ai", title: "Ask and AI", blurb: "The assistant, your AI key, and picking models." },
  { id: "self-host", title: "Self-hosting", blurb: "Run your own SaveForLatter on your own server." },
  { id: "share", title: "Share and protect", blurb: "Control who sees what." },
  { id: "stay", title: "Stay on top", blurb: "Calendar events and notifications." },
  { id: "account", title: "Account and tools", blurb: "Your data, settings and shortcuts." },
];

export const TOOLS: HelpTool[] = [
  {
    slug: "model-selection",
    category: "ai",
    title: "Choose your AI models",
    summary: "Compare every model with live prices, and get a suggestion for each job.",
    href: "/help/model-selection",
  },
];

/** Where a topic's guides live in the docs space. */
export const docsCategoryHref = (id: string) => `/help/docs/${id}`;
