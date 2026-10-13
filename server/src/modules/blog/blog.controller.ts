import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { users } from "../../db/schema";
import { ApiResponse } from "../../shared/response/api-response";
import { logAdminAction } from "../../shared/utils/audit-log";
import { listBlogPostsSchema } from "./blog.schema";
import { createPost, deletePost, getPost, getPublishedPost, listAllPosts, listPublishedPosts, updatePost } from "./blog.service";

/** What the audit log keeps about a post: enough to say which one, never its whole text. */
const brief = (post: { id: string; slug: string; title: string; status: string }) => ({ id: post.id, slug: post.slug, title: post.title, status: post.status });

export class BlogController {
  // ---- Public

  static async published(req: Request, res: Response) {
    const query = listBlogPostsSchema.parse(req.query);
    const { items, total } = await listPublishedPosts(query);
    res.status(200).json(ApiResponse.success(items, { total, limit: query.limit, offset: query.offset }));
  }

  static async publishedOne(req: Request, res: Response) {
    res.status(200).json(ApiResponse.success(await getPublishedPost(req.params.slug as string)));
  }

  // ---- Admin

  static async list(_req: Request, res: Response) {
    res.status(200).json(ApiResponse.success(await listAllPosts()));
  }

  static async get(req: Request, res: Response) {
    res.status(200).json(ApiResponse.success(await getPost(req.params.id as string)));
  }

  static async create(req: Request, res: Response) {
    // The byline defaults to the admin's own name.
    const [admin] = await db.select({ name: users.name }).from(users).where(eq(users.id, req.user!.id)).limit(1);
    const post = await createPost(req.body, { id: req.user!.id, name: admin?.name });
    await logAdminAction({ adminUserId: req.user!.id, action: "blog_post.created", targetType: "blog_post", targetId: post.id, afterValue: brief(post), ipAddress: req.ip });
    res.status(201).json(ApiResponse.success(post));
  }

  static async update(req: Request, res: Response) {
    const id = req.params.id as string;
    const { before, after } = await updatePost(id, req.body);
    await logAdminAction({
      adminUserId: req.user!.id,
      action: before.status !== after.status ? `blog_post.${after.status}` : "blog_post.updated",
      targetType: "blog_post",
      targetId: id,
      beforeValue: brief(before),
      afterValue: brief(after),
      ipAddress: req.ip,
    });
    res.status(200).json(ApiResponse.success(after));
  }

  static async remove(req: Request, res: Response) {
    const id = req.params.id as string;
    const post = await deletePost(id);
    await logAdminAction({ adminUserId: req.user!.id, action: "blog_post.deleted", targetType: "blog_post", targetId: id, beforeValue: brief(post), ipAddress: req.ip });
    res.status(200).json(ApiResponse.success({ id }));
  }
}
