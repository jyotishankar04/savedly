import type { ChangelogEntry, ChangelogMonth } from "@/components/arc/blocks/changelog-feed/changelog-feed";

// What has shipped, newest first. This is what changed for someone using
// Savedly, not a commit log. Every date is the day the change landed in the
// repository's history; there are no version numbers because the product has
// never had numbered releases. Add new entries at the top.

type Item = Omit<ChangelogEntry, "id" | "month" | "date"> & { id?: string };

const items: Item[] = [
  {
    iso: "2026-10-24",
    kind: "new",
    title: "Notes, with a real editor",
    summary: "Write notes full page, with headings, lists, to-dos, callouts, code and pictures. Type / for the menu.",
    details: [
      "Add to Savedly has a Note tab for a quick one, and Open full page when it grows.",
      "Notes save as you write, and live under Notes in the sidebar.",
      "They're memories like everything else, so search, Ask and collections cover them. The summary and tags catch up a few minutes after you stop writing.",
    ],
  },
  {
    iso: "2026-10-24",
    kind: "new",
    title: "A weekly email of things to read",
    summary: "On Sunday morning, a few saves from your Inbox you haven't read yet, oldest first.",
    details: [
      "It comes at 9 in your own time zone, and not at all in a week with nothing unread.",
      "Turn it off in Settings › Notifications, or from the link in the email.",
    ],
  },
  {
    iso: "2026-10-23",
    kind: "new",
    title: "Gestures on your phone",
    summary: "Swipe a memory to mark it read or archive it, and rename one by tapping its title.",
    details: [
      "Swipe right to mark read (or unread again), left to archive, in the Inbox, Memories, Favorites and Home.",
      "Every swipe can be undone from the message it shows.",
      "On a memory's page, tap the title to rename it in place, no dialog.",
    ],
  },
  {
    iso: "2026-10-23",
    kind: "improved",
    title: "Memories on a phone",
    summary: "Smaller cards, two to a row, by default, and a pinch switches between them and the full cards.",
    details: ["Spread two fingers for the full cards, pinch them together for the smaller ones.", "A memory's preview now opens full screen instead of squeezing the list."],
  },
  {
    iso: "2026-10-22",
    kind: "fixed",
    title: "The star and the ⋯ menu on cards",
    summary: "Starring a memory works again, and the card's buttons and menu no longer open the memory instead.",
    details: ["Starring had failed with \"Couldn't update favorite\".", "Choosing from the ⋯ menu, or clicking in a dialog it opens, now does just that."],
  },
  {
    iso: "2026-10-21",
    kind: "new",
    title: "Ask about Savedly from any page",
    summary: "A chat button on the website answers questions about Savedly from the help guides, with links to them.",
    details: ["It's on every public page; the question box in the FAQ is still there too.", "For anything else, Talk to a person goes to the contact page."],
  },
  {
    iso: "2026-10-21",
    kind: "new",
    title: "A public roadmap",
    summary: "See what's being built now and what's planned next, without dates, and upvote what you'd use most.",
    details: ["Suggest a feature from the roadmap page if it isn't there yet."],
  },
  {
    iso: "2026-10-20",
    kind: "improved",
    title: "The extension keeps up with your tabs",
    summary: "The side panel follows the page you're on, and the extension works in tabs that were open before it was installed or updated.",
    details: [
      "Single-page sites, Back and Forward, and switching tabs all update the side panel straight away.",
      "After an update there's no need to reload each open tab.",
    ],
  },
  {
    iso: "2026-10-18",
    kind: "new",
    title: "Savedly for Chrome 1.2: highlights and a side panel",
    summary: "Highlight text on any page, keep Savedly open beside the page, and get suggestions as you save.",
    details: [
      "Select text and pick a colour, or add a note. Highlights come back when you return to the page; Alt+H highlights in yellow.",
      "The side panel (Ctrl+Shift+E) shows the page you're on, your Inbox, search, recent saves and collections.",
      "The save form suggests a collection and tags, keeps recent collections one tap away, and lets you pick the cover picture.",
      "Right-click › Save to collection sends a page straight to one of your recent collections. A tour of the extension opens when you install it.",
    ],
  },
  {
    iso: "2026-10-18",
    kind: "new",
    title: "Highlights in Savedly",
    summary: "Passages you highlight with the extension appear on the memory, with their notes, and are searchable.",
    details: ["Cards show a small mark when a memory has highlights.", "Removing a highlight in the app removes it from the page too."],
  },
  {
    iso: "2026-10-18",
    kind: "new",
    title: "Inbox and Remind me",
    summary: "Links, videos and documents you save wait in your Inbox until you've read them; Remind me brings one back later.",
    details: [
      "Mark as read, or snooze until later today, tomorrow, next week or a time you pick.",
      "Reminders arrive in the app, by email and as a notification from the extension. Ask can set one for you.",
    ],
  },
  {
    iso: "2026-10-18",
    kind: "new",
    title: "Savedly for Chrome 1.1: it knows what you've saved",
    summary: "A ✓ on the Savedly icon shows the page is already saved, and you can search your library from the extension or the address bar.",
    details: [
      "Type sv and a space in the address bar to search.",
      "The check happens on your computer: the pages you visit aren't sent to Savedly to do it.",
    ],
  },
  {
    iso: "2026-10-18",
    kind: "new",
    title: "Ask looks things up on the web",
    summary: "When a save doesn't explain itself, or your library has no answer, Savedly can search the web for the missing context.",
    details: ["A film or a book named in a save gets filed where it belongs.", "Each plan includes a monthly allowance of web lookups."],
  },
  {
    iso: "2026-10-18",
    kind: "new",
    title: "Share in one tap",
    summary: "Send a link to a memory or collection by WhatsApp, Telegram, X or email, or show a QR code.",
    details: ["Add a short message before sending."],
  },
  {
    iso: "2026-10-17",
    kind: "new",
    title: "Organize many at once",
    summary: "Select memories and move, tag, favourite, archive or remind them in one go, with Undo.",
    details: [
      "Select works on every list of memories, and on collections (merge, or delete with or without their memories).",
      "J and K move through any list; X selects, F favourites, E archives and # moves to Trash.",
    ],
  },
  {
    iso: "2026-10-17",
    kind: "new",
    title: "Paste, drop or drag",
    summary: "Paste a link anywhere to save it, drop files and links onto the window, and drag memories onto a collection, Favorites, Vault, Archive or Trash.",
    details: ["Each one comes with Undo."],
  },
  {
    iso: "2026-10-17",
    kind: "improved",
    title: "Deleting for good deletes everything",
    summary: "Permanently deleting a memory also removes its files from storage.",
    details: ["Clearing everything removes your collections and tags too."],
  },
  {
    iso: "2026-10-15",
    kind: "improved",
    title: "A darker dark theme",
    summary: "Dark mode now has a true black background, with quieter borders throughout.",
    details: [],
  },
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
