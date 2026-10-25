import { toLocalInput } from "@/lib/remind";
import type { BlogPost } from "@/lib/blog";
import { DEFAULT_BLOG_AUTHOR, blogAuthor } from "@/lib/blog-authors";

export const MAX_EXCERPT = 400;
export const MAX_TAGS = 8;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type View = "write" | "markdown" | "preview";
export type SaveAction = "save" | "publish" | "unpublish";

export interface Draft {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  tags: string[];
  authorName: string;
  /** For <input type="datetime-local">, in the admin's own time zone. Empty = set when published. */
  publishedAt: string;
}

export const EMPTY: Draft = { title: "", slug: "", excerpt: "", content: "", coverImageUrl: "", tags: [], authorName: DEFAULT_BLOG_AUTHOR, publishedAt: "" };

export function toDraft(post: BlogPost): Draft {
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? "",
    content: post.content,
    coverImageUrl: post.coverImageUrl ?? "",
    tags: post.tags,
    authorName: blogAuthor(post.authorName).name,
    publishedAt: post.publishedAt ? toLocalInput(new Date(post.publishedAt)) : "",
  };
}

/** What's wrong with the draft, in the admin's terms, or null. */
export function problem(draft: Draft, isNew: boolean): string | null {
  if (!draft.title.trim()) return "Give the post a title.";
  if ((!isNew || draft.slug) && !SLUG_PATTERN.test(draft.slug)) return "The address can only have lowercase letters, numbers and hyphens.";
  if (draft.excerpt.length > MAX_EXCERPT) return `The summary is over ${MAX_EXCERPT} characters.`;
  if (draft.coverImageUrl.trim() && !/^(https?:\/\/|\/(?!\/))/i.test(draft.coverImageUrl.trim())) return "The cover image must be an https:// address, or a path on this site starting with /";
  return null;
}
