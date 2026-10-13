import { API_URL, apiFetch } from "@/lib/auth";

// The blog: posts written by admins in Markdown (server modules/blog).

export type BlogPostStatus = "draft" | "published";

/** A post as a list shows it: everything but its text. */
export interface BlogPostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  tags: string[];
  status: BlogPostStatus;
  authorName: string | null;
  publishedAt: string | null;
  updatedAt: string;
  readingMinutes: number;
}

export interface BlogPost extends BlogPostSummary {
  /** Markdown. */
  content: string;
}

export interface BlogPostInput {
  title: string;
  slug?: string;
  excerpt?: string | null;
  content?: string;
  coverImageUrl?: string | null;
  tags?: string[];
  status?: BlogPostStatus;
  authorName?: string | null;
  publishedAt?: string | null;
}

// ---- Admin (signed in, from the browser)

export const listBlogPosts = () => apiFetch<BlogPostSummary[]>("/admin/blog");
export const getBlogPost = (id: string) => apiFetch<BlogPost>(`/admin/blog/${id}`);
export const createBlogPost = (input: BlogPostInput) => apiFetch<BlogPost>("/admin/blog", { method: "POST", body: input });
export const updateBlogPost = (id: string, input: Partial<BlogPostInput>) => apiFetch<BlogPost>(`/admin/blog/${id}`, { method: "PATCH", body: input });
export const deleteBlogPost = (id: string) => apiFetch<{ id: string }>(`/admin/blog/${id}`, { method: "DELETE" });

// ---- Public (read on the website's server, so posts are in the page a search engine sees)

/** How long the website keeps a copy before asking the API again. A new post shows within this. */
const REVALIDATE_SECONDS = 60;

async function publicGet<T>(path: string): Promise<{ data: T; meta?: { total?: number } } | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) return null;
    const json = (await res.json()) as { success: boolean; data: T; meta?: { total?: number } };
    return json.success ? { data: json.data, meta: json.meta } : null;
  } catch {
    // The API is unreachable: the blog shows as empty, never as an error page.
    return null;
  }
}

export async function getPublishedPosts(options: { limit?: number; tag?: string } = {}): Promise<{ posts: BlogPostSummary[]; total: number }> {
  const query = new URLSearchParams({ limit: String(options.limit ?? 50) });
  if (options.tag) query.set("tag", options.tag);
  const result = await publicGet<BlogPostSummary[]>(`/blog?${query}`);
  return { posts: result?.data ?? [], total: result?.meta?.total ?? result?.data.length ?? 0 };
}

export async function getPublishedPost(slug: string): Promise<BlogPost | null> {
  return (await publicGet<BlogPost>(`/blog/${encodeURIComponent(slug)}`))?.data ?? null;
}

/** "13 October 2026". */
export function formatPostDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** What a post's address will be, from its title. Mirrors the server's slugify. */
export function slugify(title: string): string {
  return (
    title
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120)
      .replace(/-+$/g, "") || "post"
  );
}
