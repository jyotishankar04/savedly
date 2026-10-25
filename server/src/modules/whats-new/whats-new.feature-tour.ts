import { db } from "../../db";
import { whatsNewItems } from "../../db/schema";
import { WhatsNewKind } from "../../db/enums";

// The latest release for the "What's new" popup, newest first. An admin loads it from Admin >
// What's new ("Load the latest release"), replacing every card; afterwards they're ordinary cards
// to edit, reorder or switch off. Pictures are short looping WebP files of the website
// (client/public).

const EXTENSION_PAGE = "/chrome-extension";

export const FEATURE_TOUR_CARDS = [
  {
    kind: WhatsNewKind.NEW,
    title: "Highlight anything on the web",
    body: "Select text on any page and pick a colour, or add a note. Your highlights are there when you come back, and you can search them.",
    bullets: ["Five colours, and a note on any highlight", "Alt+H highlights the selection in yellow", "See them all on the memory in Savedly"],
    imageUrl: "/extension/loops/highlight.webp",
    ctaLabel: "Get the extension",
    ctaUrl: EXTENSION_PAGE,
  },
  {
    kind: WhatsNewKind.NEW,
    title: "Savedly beside the page",
    body: "Open the side panel and keep your library next to what you're reading. It follows you from tab to tab.",
    bullets: ["The page you're on: save it, or see what Savedly made of it", "Your Inbox, search, recent saves and collections", "Ctrl+Shift+E opens it"],
    imageUrl: "/extension/loops/panel.webp",
    ctaLabel: "See the extension",
    ctaUrl: EXTENSION_PAGE,
  },
  {
    kind: WhatsNewKind.IMPROVED,
    title: "A smarter save button",
    body: "The extension suggests where a page belongs before you save it. Nothing is applied until you tap it.",
    bullets: ["A suggested collection and tags, one tap each", "Your recent collections, one tap away", "Pick which picture shows on the card"],
    imageUrl: "/extension/loops/save.webp",
    ctaLabel: "See the extension",
    ctaUrl: EXTENSION_PAGE,
  },
  {
    kind: WhatsNewKind.NEW,
    title: "Find it again from any page",
    body: "Search your library from the extension, or type sv and a space in the address bar.",
    bullets: ["Results appear as you type", "A ✓ on the Savedly icon means the page is already saved", "Right-click to send a page to a recent collection"],
    imageUrl: "/extension/loops/find.webp",
    ctaLabel: "See the extension",
    ctaUrl: EXTENSION_PAGE,
  },
  {
    kind: WhatsNewKind.NEW,
    title: "Your Inbox, and Remind me",
    body: "Links, videos and documents you save wait in your Inbox until you've read them. Remind me brings one back when you're ready.",
    bullets: ["Mark as read, or snooze until later today, tomorrow or next week", "Reminders arrive in the app, by email and in the extension", "Ask can set a reminder for you too"],
    imageUrl: "/whats-new/loops/inbox.webp",
    ctaLabel: "Open your Inbox",
    ctaUrl: "/app/inbox",
  },
  {
    kind: WhatsNewKind.NEW,
    title: "Organize many at once",
    body: "Select memories and move, tag, favourite, archive or remind them in one go, with Undo if you change your mind.",
    bullets: ["Press Select, or X on the keyboard", "Add to or move between collections, add or remove tags", "J and K move through any list; F, E and # act on it"],
    imageUrl: "/whats-new/loops/organize.webp",
    ctaLabel: "Your memories",
    ctaUrl: "/app/memories",
  },
  {
    kind: WhatsNewKind.NEW,
    title: "Paste, drop or drag",
    body: "Paste a link anywhere in Savedly to save it, or drop files and links onto the window. Drag memories onto a collection, Favorites or Trash.",
    bullets: ["Ctrl+V outside a text box saves what you copied", "Drop files, links or pictures from another tab", "Every one comes with Undo"],
    imageUrl: "/whats-new/loops/paste-drag.webp",
    ctaLabel: "Open Savedly",
    ctaUrl: "/app",
  },
  {
    kind: WhatsNewKind.NEW,
    title: "Share in one tap",
    body: "Send a link to a memory or a collection by WhatsApp, Telegram, X or email, or show a QR code.",
    bullets: ["Add a short message", "A QR code to scan from a phone", "Still public, password-protected or invite-only"],
    imageUrl: "/whats-new/loops/share-sheet.webp",
    ctaLabel: "Your memories",
    ctaUrl: "/app/memories",
  },
  {
    kind: WhatsNewKind.NEW,
    title: "Ask looks it up when it doesn't know",
    body: "When something you save doesn't explain itself, Savedly can search the web for the missing context, both when saving and when you ask.",
    bullets: ["A film or a book named in a save gets filed where it belongs", "Ask checks the web when your library has no answer", "A monthly allowance on every plan"],
    imageUrl: null,
    ctaLabel: "Ask something",
    ctaUrl: "/app/ask",
  },
];

/** Replaces every "What's new" card with the latest release's. Returns how many cards were removed. */
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
