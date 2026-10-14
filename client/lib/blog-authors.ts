// Who a blog post can be by. The editor (Admin > Blog) offers exactly these,
// and the blog shows each one's picture beside the byline. A post stores the
// name only, so renaming someone here means updating their posts too.
// Pictures live in public/blog/authors: 256px square crops of the photos in
// public/authors (the team's is the logo).

export interface BlogAuthor {
  name: string;
  role?: string;
  avatar: string;
}

export const BLOG_AUTHORS: BlogAuthor[] = [
  { name: "The Savedly team", avatar: "/logo.svg" },
  { name: "Jyotishankar Patra", role: "Founder", avatar: "/blog/authors/jyotishankar-patra.webp" },
  { name: "Snehashree Dash", avatar: "/blog/authors/snehashree-dash.webp" },
];

export const DEFAULT_BLOG_AUTHOR = BLOG_AUTHORS[0].name;

/** The author for a post's stored name. A post with none is by the team; an unknown name keeps its name, without a picture. */
export function blogAuthor(name: string | null | undefined): { name: string; role?: string; avatar?: string } {
  if (!name?.trim()) return BLOG_AUTHORS[0];
  return BLOG_AUTHORS.find((a) => a.name.toLowerCase() === name.trim().toLowerCase()) ?? { name: name.trim() };
}
