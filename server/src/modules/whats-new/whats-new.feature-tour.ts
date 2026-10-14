import { db } from "../../db";
import { whatsNewItems } from "../../db/schema";
import { WhatsNewKind } from "../../db/enums";

// The launch tour: one card for each feature, in the order a new visitor
// would want them, for the landing page's popup. The last is the browser
// extension, marked "Coming soon" until it is in the Chrome Web Store. At
// launch everything is new, so these stand in for "what changed" until there
// is real news to post.
//
// An admin loads them from Admin > What's new ("Load the feature tour").
// Afterwards they are ordinary cards: edit, reorder or switch them off.
// Pictures are files of the website (client/public). The moving ones are short
// screen recordings of the app (client/public/whats-new/loops), looping WebP.

export const FEATURE_TOUR_CARDS = [
  {
    kind: WhatsNewKind.FEATURE,
    title: "Save anything, in one place",
    body: "Links, notes, videos, screenshots and files all go into the same box. Paste it in and carry on with your day.",
    bullets: ["Savedly reads it and writes a short summary", "Tags and a collection are suggested for you", "It tells you when you have already saved something"],
    imageUrl: "/whats-new/loops/capture.webp",
    ctaLabel: "Save something",
    ctaUrl: "/app/capture",
  },
  {
    kind: WhatsNewKind.FEATURE,
    title: "Find it by describing it",
    body: "You rarely remember the exact words. Search matches what a thing is about, so a rough description is enough.",
    bullets: ["Type it the way you remember it", "Narrow down to websites, notes, videos, images or files", "Exact names and numbers still find it"],
    imageUrl: "/whats-new/loops/search.webp",
    ctaLabel: "Try a search",
    ctaUrl: "/app/search",
  },
  {
    kind: WhatsNewKind.FEATURE,
    title: "Ask, and see where the answer came from",
    body: "Ask Savedly answers from what you have saved, and lists the saved items it used so you can check it.",
    bullets: ["Answers come from your own library", "It can save, tag and organise things for you", "It asks before it changes or removes anything"],
    imageUrl: "/whats-new/loops/ask.webp",
    ctaLabel: "Ask something",
    ctaUrl: "/app/ask",
  },
  {
    kind: WhatsNewKind.FEATURE,
    title: "Ask checks with you first",
    body: "Before Ask deletes, edits several things at once, or changes a calendar event, it says what it is about to do and waits for your yes.",
    bullets: ["One yes carries it out; anything else cancels", "Saved pages are read as material, never followed as instructions", "Nothing changes without you"],
    imageUrl: "/whats-new/loops/ask-confirm.webp",
    ctaLabel: "Ask something",
    ctaUrl: "/app/ask",
  },
  {
    kind: WhatsNewKind.FEATURE,
    title: "On your phone, like an app",
    body: "Add Savedly to your home screen and it opens straight to your library. No app store needed.",
    bullets: ["Works on Android and iPhone", "On Android, share to Savedly from any app", "The same library everywhere you sign in"],
    imageUrl: "/whats-new/loops/phone.webp",
    ctaLabel: "Open Savedly",
    ctaUrl: "/app",
  },
  {
    kind: WhatsNewKind.FEATURE,
    title: "Events found in what you save",
    body: "When something you save mentions a date and a plan, Savedly picks it out as an event and shows it on your calendar.",
    bullets: ["Day, week, month and agenda views", "Drag an event to reschedule it", "Connect Google Calendar to add events in one click"],
    imageUrl: "/whats-new/loops/calendar.webp",
    ctaLabel: "Open the calendar",
    ctaUrl: "/app/calendar",
  },
  {
    kind: WhatsNewKind.FEATURE,
    title: "Open source, and yours to run",
    body: "Savedly is free and open source. Use it here, or run it on your own server with your own keys.",
    bullets: ["Every line of code is public", "One command starts a self-hosted install", "Export everything you have saved, any time"],
    imageUrl: "/whats-new/loops/open-source.webp",
    ctaLabel: "How it works",
    ctaUrl: "/how-it-works",
  },
  {
    kind: WhatsNewKind.FEATURE,
    title: "The vault",
    body: "A PIN-protected place for things you would rather keep out of sight.",
    bullets: ["Vault items stay out of search, the graph and sharing", "They come back when you enter your PIN", "Move anything in or out in a click"],
    imageUrl: "/whats-new/loops/vault.webp",
    ctaLabel: "Open the vault",
    ctaUrl: "/app/vault",
  },
  {
    kind: WhatsNewKind.FEATURE,
    title: "Share what you have saved",
    body: "Share a memory or a whole collection with someone else, on your terms.",
    bullets: ["A public link, a password, or invite-only access", "Approve who gets in", "Revoke a link any time"],
    imageUrl: "/whats-new/loops/share.webp",
    ctaLabel: "Your memories",
    ctaUrl: "/app/memories",
  },
  {
    kind: WhatsNewKind.FEATURE,
    title: "See how it all connects",
    body: "The memory graph draws your library as a map, linking things by meaning, tag and collection.",
    bullets: ["Spot clusters you did not know you had", "Open any point to see the saved item", "Filter by collection or tag"],
    imageUrl: "/whats-new/loops/graph.webp",
    ctaLabel: "Open the graph",
    ctaUrl: "/app/graph",
  },
  {
    kind: WhatsNewKind.FEATURE,
    title: "Rediscover what you saved",
    body: "Explore brings back things you saved and forgot, so they get used instead of buried.",
    bullets: ["Things worth another look, with why", "A surprise pick when you want one", "Straight from your own library"],
    imageUrl: "/whats-new/loops/explore.webp",
    ctaLabel: "Explore",
    ctaUrl: "/app/explore",
  },
  {
    kind: WhatsNewKind.FEATURE,
    title: "Bring your bookmarks",
    body: "Move your old bookmarks in, from any browser, or paste a list of links.",
    bullets: ["Upload a bookmarks file from Chrome, Firefox or Safari", "Or paste links, one per line", "Each one is read and summarised like any save"],
    imageUrl: "/whats-new/loops/import.webp",
    ctaLabel: "Import",
    ctaUrl: "/app/import",
  },
  {
    kind: WhatsNewKind.FEATURE,
    title: "Your GitHub stars, in your library",
    body: "Connect GitHub and the repositories you have starred join your library, summarised and searchable.",
    bullets: ["Find a repo by what it does", "Starred repos sit beside everything else", "Connect from Integrations"],
    imageUrl: "/whats-new/loops/github.webp",
    ctaLabel: "Integrations",
    ctaUrl: "/app/integrations",
  },
  {
    kind: WhatsNewKind.FEATURE,
    title: "Your library at a glance",
    body: "Insights shows what you save, what it is about, and where it comes from.",
    bullets: ["Your top topics and sites", "What kinds of things you save", "How you save: from the app, your phone or the extension"],
    imageUrl: "/whats-new/loops/insights.webp",
    ctaLabel: "Insights",
    ctaUrl: "/app/insights",
  },
  {
    kind: WhatsNewKind.FEATURE,
    title: "Made for the keyboard",
    body: "Press Ctrl+K (⌘K on a Mac) to jump anywhere or do anything, without reaching for the mouse.",
    bullets: ["Every page and action in one search", "Save something with Ctrl+Q", "Press Ctrl+/ to see every shortcut"],
    imageUrl: "/whats-new/loops/palette.webp",
    ctaLabel: "Open Savedly",
    ctaUrl: "/app",
  },
  {
    kind: WhatsNewKind.UPCOMING,
    title: "Save from any page",
    body: "The Savedly browser extension saves the page you are on, a link, some text, an image or a screenshot, without leaving it.",
    bullets: ["One click, or right-click anything", "Screenshot an area or the whole view", "Uses your Savedly sign-in"],
    imageUrl: "/whats-new/loops/extension.webp",
    ctaLabel: null,
    ctaUrl: null,
  },
];

/** Replaces every "What's new" card with the feature tour. Returns how many cards were removed. */
export async function loadFeatureTour(adminUserId?: string): Promise<{ removed: number; added: number }> {
  const removed = await db.transaction(async (tx) => {
    const old = await tx.delete(whatsNewItems).returning({ id: whatsNewItems.id });
    await tx
      .insert(whatsNewItems)
      .values(FEATURE_TOUR_CARDS.map((card, sortOrder) => ({ ...card, isActive: true, sortOrder, createdBy: adminUserId ?? null })));
    return old.length;
  });
  return { removed, added: FEATURE_TOUR_CARDS.length };
}
