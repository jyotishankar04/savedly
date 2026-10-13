import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "../../db";
import { blogPosts } from "../../db/schema";
import { BlogPostStatus } from "../../db/enums";
import { AppError } from "../../shared/errors/app-error";
import type { CreateBlogPostInput, ListBlogPostsInput, UpdateBlogPostInput } from "./blog.schema";

// The public blog. Admins write posts in Markdown; the website shows only
// the published ones. Every public read filters on status here, so a draft
// can't be reached by guessing its address.

/** A post without its body: what a list needs. */
const summary = {
  id: blogPosts.id,
  slug: blogPosts.slug,
  title: blogPosts.title,
  excerpt: blogPosts.excerpt,
  coverImageUrl: blogPosts.coverImageUrl,
  tags: blogPosts.tags,
  status: blogPosts.status,
  authorName: blogPosts.authorName,
  publishedAt: blogPosts.publishedAt,
  updatedAt: blogPosts.updatedAt,
  // Roughly how long the post takes to read, at 220 words a minute.
  readingMinutes: sql<number>`greatest(1, ceil(array_length(regexp_split_to_array(trim(${blogPosts.content}), '\\s+'), 1) / 220.0))::int`,
};

const isPublished = eq(blogPosts.status, BlogPostStatus.PUBLISHED);

/** "My First Post!" -> "my-first-post". */
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

async function slugTaken(slug: string, exceptId?: string): Promise<boolean> {
  const [row] = await db
    .select({ id: blogPosts.id })
    .from(blogPosts)
    .where(exceptId ? and(eq(blogPosts.slug, slug), ne(blogPosts.id, exceptId)) : eq(blogPosts.slug, slug))
    .limit(1);
  return !!row;
}

/** A slug nobody else has: the wanted one, or the wanted one with -2, -3… */
async function freeSlug(wanted: string): Promise<string> {
  if (!(await slugTaken(wanted))) return wanted;
  for (let n = 2; n < 200; n++) {
    const candidate = `${wanted}-${n}`;
    if (!(await slugTaken(candidate))) return candidate;
  }
  throw new AppError("Couldn't find a free address for this post. Set one by hand.", 409, "SLUG_TAKEN");
}

// ---- Public

export async function listPublishedPosts({ limit, offset, tag }: ListBlogPostsInput) {
  const where = tag ? and(isPublished, sql`${blogPosts.tags} @> ${JSON.stringify([tag])}::jsonb`) : isPublished;
  const [items, [{ total }]] = await Promise.all([
    db.select(summary).from(blogPosts).where(where).orderBy(desc(blogPosts.publishedAt), desc(blogPosts.createdAt)).limit(limit).offset(offset),
    db.select({ total: sql<number>`count(*)::int` }).from(blogPosts).where(where),
  ]);
  return { items, total };
}

export async function getPublishedPost(slug: string) {
  const [post] = await db
    .select({ ...summary, content: blogPosts.content })
    .from(blogPosts)
    .where(and(isPublished, eq(blogPosts.slug, slug)))
    .limit(1);
  // A draft answers exactly like a post that doesn't exist.
  if (!post) throw new AppError("Post not found", 404, "NOT_FOUND");
  return post;
}

// ---- Admin

export async function listAllPosts() {
  return db.select({ ...summary, createdAt: blogPosts.createdAt }).from(blogPosts).orderBy(desc(blogPosts.updatedAt));
}

export async function getPost(id: string) {
  const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
  if (!post) throw new AppError("Post not found", 404, "NOT_FOUND");
  return post;
}

export async function createPost(input: CreateBlogPostInput, admin: { id: string; name?: string | null }) {
  const publishing = input.status === BlogPostStatus.PUBLISHED;
  const slug = input.slug ? input.slug : await freeSlug(slugify(input.title));
  if (input.slug && (await slugTaken(input.slug))) throw new AppError("Another post already uses that address.", 409, "SLUG_TAKEN");

  const [post] = await db
    .insert(blogPosts)
    .values({
      slug,
      title: input.title,
      excerpt: input.excerpt || null,
      content: input.content ?? "",
      coverImageUrl: input.coverImageUrl || null,
      tags: input.tags ?? [],
      status: input.status ?? BlogPostStatus.DRAFT,
      authorName: input.authorName || admin.name || null,
      publishedAt: input.publishedAt ? new Date(input.publishedAt) : publishing ? new Date() : null,
      createdBy: admin.id,
    })
    .returning();
  return post;
}

export async function updatePost(id: string, input: UpdateBlogPostInput) {
  const before = await getPost(id);
  if (input.slug && input.slug !== before.slug && (await slugTaken(input.slug, id))) {
    throw new AppError("Another post already uses that address.", 409, "SLUG_TAKEN");
  }

  // Published for the first time: that moment is its date, unless one is given.
  const nowPublished = input.status === BlogPostStatus.PUBLISHED && !before.publishedAt && input.publishedAt === undefined;

  const [after] = await db
    .update(blogPosts)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.excerpt !== undefined ? { excerpt: input.excerpt || null } : {}),
      ...(input.content !== undefined ? { content: input.content } : {}),
      ...(input.coverImageUrl !== undefined ? { coverImageUrl: input.coverImageUrl || null } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.authorName !== undefined ? { authorName: input.authorName || null } : {}),
      ...(input.publishedAt !== undefined ? { publishedAt: input.publishedAt ? new Date(input.publishedAt) : null } : {}),
      ...(nowPublished ? { publishedAt: new Date() } : {}),
      updatedAt: new Date(),
    })
    .where(eq(blogPosts.id, id))
    .returning();
  return { before, after };
}

export async function deletePost(id: string) {
  const [post] = await db.delete(blogPosts).where(eq(blogPosts.id, id)).returning();
  if (!post) throw new AppError("Post not found", 404, "NOT_FOUND");
  return post;
}
