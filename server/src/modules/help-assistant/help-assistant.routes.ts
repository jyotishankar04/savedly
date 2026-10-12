import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { env } from "../../config/env";
import { cacheRedis } from "../../config/redis";
import { AppError } from "../../shared/errors/app-error";
import { helpAskDailyRateLimiter, helpAskMinuteRateLimiter } from "../../shared/middlewares/rate-limit";
import { validate } from "../../shared/middlewares/validate";
import { ApiResponse } from "../../shared/response/api-response";
import { logger } from "../../shared/utils/logger";
import { answerHelpQuestion, streamHelpAnswer } from "./help-assistant.graph";

// Mounted at /help. Public: the website's help box, for visitors who aren't
// signed in. Three things keep it from being an open tap on the AI account:
// a short question, a per-visitor limit, and a daily total for everyone.

const router = Router();

const askSchema = z.object({ question: z.string().trim().min(3).max(300) });

const UNAVAILABLE = "The help box isn't available right now. Please try the Help Center.";
const BUSY = "The help box has answered a lot of questions today. Please try the Help Center, or write to us.";

/** Counts today's questions from everyone. False once the day's total is used up. */
async function withinDailyBudget(): Promise<boolean> {
  if (env.HELP_ASSISTANT_DAILY_LIMIT === 0) return false;
  const key = `help:asked:${new Date().toISOString().slice(0, 10)}`;
  try {
    const count = await cacheRedis.incr(key);
    if (count === 1) await cacheRedis.expire(key, 2 * 24 * 60 * 60);
    return count <= env.HELP_ASSISTANT_DAILY_LIMIT;
  } catch {
    // The counter is unreachable. The per-visitor limits still apply, so
    // answer rather than switch the box off for everyone.
    return true;
  }
}

/**
 * POST /help/ask. With `Accept: text/event-stream` the answer arrives as it
 * is written ("delta" events, then one "done"); otherwise as one JSON reply.
 */
router.post("/ask", helpAskMinuteRateLimiter, helpAskDailyRateLimiter, validate(askSchema), async (req: Request, res: Response) => {
  if (!(await withinDailyBudget())) throw new AppError(BUSY, 429, "HELP_BUSY");
  const { question } = req.body as z.infer<typeof askSchema>;

  if (!req.accepts(["json", "text/event-stream"]) || req.headers.accept?.includes("text/event-stream") !== true) {
    try {
      res.status(200).json(ApiResponse.success(await answerHelpQuestion(question)));
    } catch (err) {
      logger.warn({ err: (err as Error).message }, "[help] couldn't answer a question");
      throw new AppError(UNAVAILABLE, 503, "HELP_UNAVAILABLE");
    }
    return;
  }

  // Stops the model when the visitor presses stop or leaves the page.
  const abort = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) abort.abort();
  });
  res.status(200).set({ "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
  res.flushHeaders();
  const send = (event: unknown) => res.write(`data: ${JSON.stringify(event)}\n\n`);
  try {
    for await (const event of streamHelpAnswer(question, abort.signal)) send(event);
  } catch (err) {
    if (!abort.signal.aborted) {
      logger.warn({ err: (err as Error).message }, "[help] couldn't answer a question");
      send({ type: "error", message: UNAVAILABLE });
    }
  }
  res.end();
});

export default router;
