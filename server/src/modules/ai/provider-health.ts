import { cacheRedis } from "../../config/redis";

// Whether the AI the instance pays for is answering. When the provider
// account runs out of credits every AI step fails quietly: saves get no
// summary and Ask has no answer. This keeps the last such refusal where an
// admin can see it, and forgets it on the next call that works.

const KEY = "ai:provider-health";
/** A refusal older than this says nothing about now. */
const TTL_SECONDS = 24 * 60 * 60;

export interface AiHealth {
  ok: boolean;
  problem: "no-credits" | null;
  provider: string | null;
  /** When the provider last refused for this reason. */
  since: string | null;
}

/**
 * Why a provider refused a request, when it's one of the two reasons an
 * operator can act on. Both arrive as HTTP 429, so they are told apart by
 * the error's code and wording.
 */
export function providerRefusal(err: unknown): "no-credits" | "rate-limit" | null {
  const e = err as { status?: number; code?: string; message?: string; lc_error_code?: string } | null;
  const text = `${e?.code ?? ""} ${e?.lc_error_code ?? ""} ${e?.message ?? ""}`;
  if (/credit_balance|insufficient_quota|no credits|exceeded your current quota|billing/i.test(text)) return "no-credits";
  if (e?.status === 429 || /rate.?limit|too many requests|\b429\b/i.test(text)) return "rate-limit";
  return null;
}

// Whether this process believes the flag is set, so a working call only
// talks to Redis when there may be something to clear.
let flagged = true;

/** The instance's own AI account refused for lack of credits. */
export function recordNoCredits(provider: string): void {
  flagged = true;
  const value = JSON.stringify({ provider, since: new Date().toISOString() });
  // NX keeps the first refusal's time; a cache that's down just means no banner.
  void cacheRedis.set(KEY, value, "EX", TTL_SECONDS, "NX").catch(() => {});
}

/** A call on the instance's own AI account worked. */
export function recordAiWorking(): void {
  if (!flagged) return;
  flagged = false;
  void cacheRedis.del(KEY).catch(() => {
    flagged = true;
  });
}

export async function getAiHealth(): Promise<AiHealth> {
  try {
    const raw = await cacheRedis.get(KEY);
    if (!raw) return { ok: true, problem: null, provider: null, since: null };
    const { provider, since } = JSON.parse(raw) as { provider: string; since: string };
    return { ok: false, problem: "no-credits", provider, since };
  } catch {
    return { ok: true, problem: null, provider: null, since: null };
  }
}
