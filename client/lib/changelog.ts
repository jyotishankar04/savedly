import type { ChangelogEntry, ChangelogMonth } from "@/components/arc/blocks/changelog-feed/changelog-feed";

// What has shipped, newest first. This is what changed for someone using
// Savedly, not a commit log. Every date is the day the change landed in the
// repository's history; there are no version numbers because the product has
// never had numbered releases. Add new entries at the top.

type Item = Omit<ChangelogEntry, "id" | "month" | "date"> & { id?: string };

const items: Item[] = [
  {
    iso: "2026-10-10",
    kind: "improved",
    title: "Ask checks with you before it changes anything",
    summary: "Deleting, editing several things at once and changing a calendar event now need a yes from you first.",
    details: [
      "Ask says exactly what it is about to do and waits. One yes carries it out; anything else cancels it.",
      "Pages and files you save are treated as material to read, never as instructions for the assistant to follow.",
    ],
  },
  {
    iso: "2026-10-09",
    kind: "new",
    title: "GitHub stars",
    summary: "Connect GitHub and the repositories you have starred join your library.",
    details: ["Each starred repository is saved like anything else: summarised, tagged and searchable."],
  },
  {
    iso: "2026-10-09",
    kind: "new",
    title: "Duplicate detection",
    summary: "Savedly notices when you are saving something you already have.",
    details: ["You are asked before a duplicate is saved from the app.", "Saves made elsewhere, such as from the browser extension, send a notification instead."],
  },
  {
    iso: "2026-10-08",
    kind: "improved",
    title: "Easier self-hosting",
    summary: "A self-hosted install now walks its admin through setup and keeps them informed.",
    details: [
      "A setup checklist on the dashboard.",
      "Download a backup of the install from the admin page.",
      "A notice when a newer release exists.",
      "The install opens on sign-in, without the marketing site in front of it.",
    ],
  },
  {
    iso: "2026-10-06",
    kind: "improved",
    title: "A new name: Savedly",
    summary: "The product was renamed to Savedly, at savedly.app.",
    details: ["Your account, your library and your links are unchanged."],
  },
  {
    iso: "2026-10-04",
    kind: "new",
    title: "Install it on your phone",
    summary: "Add Savedly to your home screen and it opens like an app.",
    details: ["Works on Android and iPhone, with no app store.", "On Android, Savedly appears in the share menu, so you can save from other apps."],
    media: { type: "photo", src: "/whats-new/install.webp", alt: "The Savedly icon beside a phone showing the app's home screen", caption: "Savedly on a phone, opened from the home screen.", width: 1920, height: 1080 },
  },
  {
    iso: "2026-10-03",
    kind: "improved",
    title: "Help guides in one place",
    summary: "The Help Center's guides moved into a searchable docs space.",
    details: ["Guides are grouped by what you are trying to do, with a self-hosting guide alongside them."],
  },
  {
    iso: "2026-09-30",
    kind: "new",
    title: "A proper calendar",
    summary: "Day, week, month and agenda views, with drag to reschedule.",
    details: ["Events found in what you save show up here.", "Asking about an event in Ask shows it as a card."],
  },
  {
    iso: "2026-09-29",
    kind: "new",
    title: "Free, Lite and Pro",
    summary: "The hosted service now has three plans, with AI run for you on every one.",
    details: [
      "There is nothing to configure to start saving or asking: each plan includes a monthly allowance.",
      "Lite adds the private vault, calendar sync and bulk actions. Pro adds direct shares and invite-only access with approval.",
      "Self-hosting is unaffected: every feature stays free and unlimited, with your own AI key.",
    ],
  },
  {
    iso: "2026-09-29",
    kind: "improved",
    title: "Ask can organise and manage your calendar",
    summary: "Ten new things Ask can do: find, file and tidy what you saved, and work with calendar events.",
    details: ["Ask can create, edit and delete memories and place them in collections, not only search and report back."],
  },
  {
    iso: "2026-09-28",
    kind: "new",
    title: "Open source, and self-hosting with one command",
    summary: "Savedly is licensed under AGPL-3.0, and can be run on your own server.",
    details: ["One command starts a self-hosted install.", "It is configured from environment settings or from its admin pages.", "Self-hosted installs have every feature, without limits."],
  },
  {
    iso: "2026-09-19",
    kind: "new",
    title: "Events found in what you save",
    summary: "When something you save mentions a date and a plan, Savedly picks it out as an event.",
    details: ["Connect Google Calendar and a detected event can be added to it in one click."],
  },
  {
    iso: "2026-09-14",
    kind: "new",
    title: "Sharing",
    summary: "Share a memory or a collection with someone else.",
    details: ["A public link, a password-protected link, or invite-only access with approval requests.", "A link or one person's access can be revoked at any time."],
  },
  {
    iso: "2026-09-14",
    kind: "new",
    title: "The vault",
    summary: "A PIN-protected place for memories you would rather keep out of your regular views.",
    details: ["Vault items stay out of search, the graph and sharing until you enter your PIN.", "Trashed memories now stay for 15 days before they are removed for good."],
    media: { type: "photo", src: "/help/docs/vault.png", alt: "The vault's setup screen, asking for a new PIN", caption: "Setting up the vault.", width: 1280, height: 800 },
  },
  {
    iso: "2026-09-12",
    kind: "new",
    title: "Memory graph",
    summary: "A picture of how the things you saved connect, by meaning, tag and collection.",
    details: ["Open it from Discover in the sidebar."],
  },
  {
    iso: "2026-09-03",
    kind: "improved",
    title: "A first-time tour",
    summary: "New accounts get a short walk through the app.",
    details: ["It points out search, Quick Capture and where your saves live."],
  },
  {
    iso: "2026-09-02",
    kind: "new",
    title: "Ask",
    summary: "A chat assistant that answers from what you have saved.",
    details: ["Answers are in plain language, with the saved items they came from listed beside them.", "If you have saved nothing on a subject, it says so."],
    media: { type: "photo", src: "/landing/app-ask-light.webp", alt: "Ask answering a question, with the saved pages it used listed beside the answer", caption: "An answer with its sources, from a sample library.", width: 2160, height: 1350 },
  },
  {
    iso: "2026-08-31",
    kind: "new",
    title: "Search by meaning",
    summary: "Search matches what a thing is about as well as the exact words.",
    details: ["Keyword and meaning-based matching are merged into one ranked list.", "Filters narrow results by type."],
    media: { type: "photo", src: "/help/docs/search-2.png", alt: "A search for bread baking tips returning a sourdough page and a starter feeding note", caption: "Searching a sample library by description.", width: 1280, height: 800 },
  },
  {
    iso: "2026-08-31",
    kind: "improved",
    title: "A real dashboard",
    summary: "Archive, Trash, Notifications and Insights now show your own data.",
    details: ["Earlier builds had placeholder pages in their place."],
  },
];

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2026-10-09" -> "Oct 9", without going through a time zone. */
function shortDate(iso: string): string {
  const [, month, day] = iso.split("-").map(Number);
  return `${MONTH_NAMES[month! - 1]!.slice(0, 3)} ${day}`;
}

export const changelogEntries: ChangelogEntry[] = items.map((item, index) => ({
  ...item,
  id: item.id ?? `${item.iso}-${index}`,
  month: item.iso.slice(0, 7),
  date: shortDate(item.iso),
}));

/** The months that have entries, newest first. */
export const changelogMonths: ChangelogMonth[] = [...new Set(changelogEntries.map((entry) => entry.month))].map((key) => {
  const [year, month] = key.split("-").map(Number);
  const name = MONTH_NAMES[month! - 1]!;
  return { key, label: `${name} ${year}`, short: name.slice(0, 3) };
});
