import { competitors } from "@/lib/data/comparisons";
import { GITHUB_URL } from "@/lib/open-source";

// The public website, page by page, in plain words. The question box on the
// home page reads this (through /api/help) so it can tell a visitor that a
// page exists and send them to it. Keep each summary to what the page really
// contains today; when a page is added, removed or changes its purpose,
// change it here too.

export interface SitePage {
  /** Short and stable: the model names pages by this. */
  id: string;
  title: string;
  href: string;
  summary: string;
}

export const SITE_PAGES: SitePage[] = [
  { id: "home", title: "Home", href: "/", summary: "What Savedly is and how it works, with a box to ask questions." },
  { id: "features", title: "Features", href: "/features", summary: "Every capability explained: saving, automatic summaries and tags, search by meaning, the Ask assistant, collections, the memory graph, the vault, calendar sync and integrations." },
  { id: "how-it-works", title: "How it works", href: "/how-it-works", summary: "What happens to a save step by step (read, summarized, filed, indexed), what the system is made of, and exactly what data leaves it and why." },
  { id: "pricing", title: "Pricing", href: "/pricing", summary: "The hosted plans (Free, Lite, Pro), what each includes, their prices, and how self-hosting compares." },
  { id: "help", title: "Help Center", href: "/help", summary: "The documentation: step-by-step guides for getting started, saving, importing, organizing, search, Ask, sharing, the vault, calendar, notifications, keyboard shortcuts, account settings and self-hosting." },
  { id: "getting-started", title: "Getting started guide", href: "/help/docs/get-started/getting-started", summary: "The first guide to read: create an account and save your first items." },
  { id: "self-host", title: "Self-hosting guide", href: "/help/docs/self-host/self-host", summary: "How to run your own copy of Savedly with Docker, set up AI, back up and update." },
  { id: "changelog", title: "Changelog", href: "/changelog", summary: "What has been released, month by month." },
  { id: "compare", title: "Compare", href: "/vs", summary: "How Savedly compares with mymind, Memorie, Fabric, Raindrop, Readwise Reader, Notion, Evernote and Google Keep, one page each." },
  // One page per comparison (lib/data/comparisons.ts).
  ...competitors.map((c) => ({ id: `compare-${c.slug}`, title: `Savedly vs ${c.name}`, href: `/vs/${c.slug}`, summary: `How Savedly compares with ${c.name}, side by side.` })),
  { id: "security", title: "Security", href: "/security", summary: "How data is protected: HTTPS, which secrets are encrypted at rest, how the PIN vault works, and how to report a vulnerability." },
  { id: "privacy", title: "Privacy Policy", href: "/privacy", summary: "What is collected, how AI processing works, what Google and GitHub data is used for, where data is stored, and how to export or delete it." },
  { id: "terms", title: "Terms of Service", href: "/terms", summary: "The terms for using the hosted service." },
  { id: "cookies", title: "Cookie Policy", href: "/cookies", summary: "The small number of cookies used, for signing in and nothing else." },
  { id: "contribute", title: "Contribute", href: "/contribute", summary: "How to help the open source project: report bugs, send code, or support it." },
  { id: "community", title: "Community", href: "/community", summary: "Where to talk to the team and other users: the Discord server and GitHub." },
  { id: "contact", title: "Contact", href: "/contact", summary: "How to reach the team for support, questions or feedback." },
  { id: "report", title: "Report a bug", href: "/report", summary: "A form to report a problem or request a feature." },
  { id: "about", title: "About", href: "/about", summary: "Who makes Savedly and why." },
  { id: "blog", title: "Blog", href: "/blog", summary: "The blog: notes from building Savedly." },
  { id: "sign-in", title: "Sign in", href: "/auth/login", summary: "Sign in to an existing account." },
  { id: "sign-up", title: "Create an account", href: "/auth/signup", summary: "Create a new account on the hosted service." },
  { id: "github", title: "Source code on GitHub", href: GITHUB_URL, summary: "The public repository: the code, issues, and the installer for self-hosting." },
];
