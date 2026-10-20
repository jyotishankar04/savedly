// The roadmap items people can vote for: the "Coming next" list on the
// website's /roadmap page (client/lib/roadmap.ts), by slug. Add a slug here
// when an item is added there, so votes for it are accepted; a slug removed
// here stops taking votes (its old votes stay, unseen).
export const ROADMAP_VOTABLE_SLUGS = [
  "firefox-extension",
  "pdf-highlights",
  "weekly-email",
  "import-highlights",
  "more-integrations",
  "audio",
] as const;

export type RoadmapSlug = (typeof ROADMAP_VOTABLE_SLUGS)[number];
