// The public roadmap (/roadmap): what's being built now, and what's next, in
// order rather than with dates (a date is a promise a small team can't always
// keep; an order it can). What has shipped comes from lib/changelog.ts, so the
// two never disagree. Edit this file to change the roadmap; when an item is
// added to `next`, add its slug to the server's list too
// (server/src/modules/roadmap/roadmap.items.ts) so it can take votes.

export interface RoadmapItem {
  slug: string;
  title: string;
  description: string;
  /** The part of Savedly it lands in. */
  area: string;
  points?: string[];
}

/** Being built now. */
export const roadmapNow: RoadmapItem[] = [
  {
    slug: "phone-gestures",
    title: "Gestures on your phone",
    description: "Faster on a phone: swipe a memory to archive it or mark it read, and rename one by tapping its title.",
    area: "App",
    points: ["Swipe left or right on any list", "Rename in place, no dialog", "Undo on every swipe"],
  },
];

/** Next, roughly in order. People can vote for these. */
export const roadmapNext: RoadmapItem[] = [
  {
    slug: "firefox-extension",
    title: "Savedly for Firefox",
    description: "The browser extension for Firefox: save, highlight and search without leaving the page.",
    area: "Extension",
  },
  {
    slug: "pdf-highlights",
    title: "Highlights in PDFs",
    description: "Highlight passages in PDFs you open in the browser, not just web pages.",
    area: "Extension",
  },
  {
    slug: "weekly-email",
    title: "A weekly email of things to read",
    description: "A short email once a week bringing back a few unread saves from your Inbox, so they get read instead of buried.",
    area: "Inbox",
  },
  {
    slug: "import-highlights",
    title: "Import from Kindle and Readwise",
    description: "Bring the highlights you've made elsewhere into Savedly, next to everything else.",
    area: "Highlights",
  },
  {
    slug: "more-integrations",
    title: "Notion and more integrations",
    description: "Connect Notion, and save from the places you already read: Reddit, YouTube, X, Instagram and LinkedIn.",
    area: "Integrations",
  },
  {
    slug: "audio",
    title: "Audio, fully supported",
    description: "Save voice notes, podcasts and audio files, transcribed so you can search and ask about what was said.",
    area: "Saving",
  },
];
