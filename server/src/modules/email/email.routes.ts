import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { db } from "../../db";
import { userSettings } from "../../db/schema";
import { bumpUserCache } from "../../shared/cache/response-cache";
import { AppError } from "../../shared/errors/app-error";
import { verifyUnsubscribeToken } from "../../shared/mailer/unsubscribe";
import { ApiResponse } from "../../shared/response/api-response";

// Public: these are reached from a link in an email, signed out. The signed
// token in the link is the proof of who is asking.
const router = Router();

const linkSchema = z.object({ u: z.string().uuid(), t: z.string().min(1).max(200) });

async function setUnsubscribed(req: Request, unsubscribed: boolean): Promise<void> {
  // An inbox's one-click button sends the link's query and its own form body.
  const parsed = linkSchema.safeParse({ u: req.query.u ?? req.body?.u, t: req.query.t ?? req.body?.t });
  if (!parsed.success || !verifyUnsubscribeToken(parsed.data.u, parsed.data.t)) {
    throw new AppError("This link isn't valid. Use the link in a recent email.", 400, "INVALID_LINK");
  }
  const emailUnsubscribedAt = unsubscribed ? new Date() : null;
  await db
    .insert(userSettings)
    .values({ userId: parsed.data.u, emailUnsubscribedAt })
    .onConflictDoUpdate({ target: userSettings.userId, set: { emailUnsubscribedAt, updatedAt: new Date() } });
  await bumpUserCache(parsed.data.u);
}

router.post("/unsubscribe", async (req: Request, res: Response) => {
  await setUnsubscribed(req, true);
  res.json(ApiResponse.success({ unsubscribed: true }));
});

router.post("/resubscribe", async (req: Request, res: Response) => {
  await setUnsubscribed(req, false);
  res.json(ApiResponse.success({ unsubscribed: false }));
});

export default router;
