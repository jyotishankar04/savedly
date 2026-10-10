import { createHash, randomUUID } from "node:crypto";
import { cacheRedis } from "../../../../config/redis";
import { userTimeZone } from "../../../../shared/utils/time-zone";
import { requireUserId, type RagRuntime } from "./shared";

// Ask asks before it acts.
//
// A tool wrapped in confirmFirst() doesn't act when the model calls it. It
// writes down what it was asked to do and answers "this needs the user's
// yes". The action runs only on the next turn, and only when that turn's own
// user message is a confirmation. That check is made here, in code, against
// the message the user sent (settlePending, called by streamAsk); nothing the
// model says and nothing inside a saved page can approve an action.
//
// What then runs is the input that was written down and shown to the user,
// not whatever the model passes the second time.

export interface PendingAction {
  id: string;
  tool: string;
  input: unknown;
  /** What will happen, in the user's terms. Shown on the confirmation card. */
  description: string;
  key: string;
}

export interface ConfirmationRequest {
  needsConfirmation: true;
  pendingActionId: string;
  action: string;
  description: string;
  instruction: string;
}

interface Stored {
  turnId: string;
  actions: PendingAction[];
}

/** A question left unanswered this long is dropped. */
const PENDING_TTL_SECONDS = 30 * 60;
/** Most actions one question may queue for a single yes. */
const MAX_PENDING_PER_TURN = 10;

const pendingKey = (threadId: string) => `ask:pending:${threadId}`;
const actionKey = (tool: string, input: unknown) => createHash("sha256").update(`${tool}:${JSON.stringify(input)}`).digest("hex");

/**
 * Ends the description of every tool that asks first. Without it a model
 * tends to ask "shall I?" itself and only then call the tool, which asks
 * again: the user confirms twice.
 */
export const ASKS_FIRST_NOTE =
  " SAFE TO CALL RIGHT AWAY: this tool never acts on the first call. It shows the user a confirmation card and waits for their yes. So do NOT ask the user for permission yourself before calling it; call it as soon as you know the target, and let the card do the asking.";

const INSTRUCTION =
  "Nothing has been changed yet. Tell the user in one short sentence exactly what you are about to do, and ask them to confirm. Do not call this tool again in this reply.";

/** The whole message must be a yes; "yes, but only the first" is not one. */
const CONFIRMATIONS = new Set([
  "yes",
  "y",
  "yep",
  "yeah",
  "yes please",
  "yes do it",
  "yes go ahead",
  "yes confirm",
  "confirm",
  "confirmed",
  "i confirm",
  "do it",
  "go ahead",
  "please do",
  "proceed",
  "ok",
  "okay",
  "sure",
]);

export function isConfirmation(message: string): boolean {
  const normal = message
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return CONFIRMATIONS.has(normal);
}

// What the user's message settled, per question (turnId). In memory: the
// approval is read by the same request that made it.
interface Settled {
  approved: PendingAction[];
  /** How many approved actions this turn started with. */
  approvedCount: number;
  cancelled: number;
  at: number;
}
const settledByTurn = new Map<string, Settled>();

/**
 * Called once at the start of every question, with the user's own message.
 * Whatever was waiting is taken off the list either way: a yes approves it
 * for this turn only, anything else discards it.
 */
export async function settlePending(threadId: string, turnId: string, userMessage: string): Promise<void> {
  let stored: Stored | null = null;
  try {
    const raw = await cacheRedis.getdel(pendingKey(threadId));
    stored = raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    // Can't read what was waiting: nothing is approved.
    stored = null;
  }
  if (!stored?.actions.length) return;

  const yes = isConfirmation(userMessage);
  settledByTurn.set(turnId, {
    approved: yes ? stored.actions : [],
    approvedCount: yes ? stored.actions.length : 0,
    cancelled: yes ? 0 : stored.actions.length,
    at: Date.now(),
  });
  if (settledByTurn.size > 5000) {
    const cutoff = Date.now() - 60 * 60_000;
    for (const [id, s] of settledByTurn) if (s.at < cutoff) settledByTurn.delete(id);
  }
}

/** For the prompt and the front desk: what this turn's message approved or discarded. */
export function turnConfirmation(turnId: string | undefined): { approvedTools: string[]; cancelled: number } {
  const settled = turnId ? settledByTurn.get(turnId) : undefined;
  return { approvedTools: settled?.approved.map((a) => a.tool) ?? [], cancelled: settled?.cancelled ?? 0 };
}

/** True when this turn's message was a yes to something. */
export function turnIsConfirmation(turnId: string | undefined): boolean {
  return !!turnId && (settledByTurn.get(turnId)?.approvedCount ?? 0) > 0;
}

function takeApproval(turnId: string, tool: string, input: unknown): PendingAction | null {
  const settled = settledByTurn.get(turnId);
  if (!settled?.approved.length) return null;
  const key = actionKey(tool, input);
  // The same call first; otherwise the next approved call to this tool.
  let index = settled.approved.findIndex((a) => a.key === key);
  if (index < 0) index = settled.approved.findIndex((a) => a.tool === tool);
  if (index < 0) return null;
  return settled.approved.splice(index, 1)[0];
}

async function requestConfirmation(threadId: string, turnId: string, tool: string, input: unknown, description: string): Promise<PendingAction> {
  const key = actionKey(tool, input);
  let stored: Stored | null = null;
  try {
    const raw = await cacheRedis.get(pendingKey(threadId));
    stored = raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    throw new Error(`${tool}: couldn't ask the user to confirm right now, so nothing was changed. Tell the user to try again in a moment.`);
  }
  // Only this question's requests wait together; an older question's are gone.
  const actions = stored?.turnId === turnId ? stored.actions : [];
  const existing = actions.find((a) => a.key === key);
  if (existing) return existing;
  if (actions.length >= MAX_PENDING_PER_TURN) {
    throw new Error(`That's more than ${MAX_PENDING_PER_TURN} separate changes in one go. Ask the user to confirm the ones already listed first, then continue.`);
  }

  const action: PendingAction = { id: randomUUID(), tool, input, description, key };
  try {
    await cacheRedis.set(pendingKey(threadId), JSON.stringify({ turnId, actions: [...actions, action] } satisfies Stored), "EX", PENDING_TTL_SECONDS);
  } catch {
    throw new Error(`${tool}: couldn't ask the user to confirm right now, so nothing was changed. Tell the user to try again in a moment.`);
  }
  return action;
}

export function isConfirmationRequest(value: unknown): value is ConfirmationRequest {
  return !!value && typeof value === "object" && (value as { needsConfirmation?: unknown }).needsConfirmation === true;
}

/**
 * Wraps a tool that changes or removes something. `describe` says what will
 * happen, in the user's terms, and may throw when the request can't be done
 * at all (nothing is then left waiting). `run` does it.
 */
export function confirmFirst<I, R>(
  toolName: string,
  describe: (input: I, userId: string) => Promise<string> | string,
  run: (input: I, runtime: RagRuntime) => Promise<R>,
): (input: I, runtime: RagRuntime) => Promise<R | ConfirmationRequest> {
  return async (input, runtime) => {
    const userId = requireUserId(runtime, toolName);
    const { turnId, threadId } = runtime.context ?? {};
    // Without a conversation to ask in, the answer is no.
    if (!turnId || !threadId) throw new Error(`${toolName}: there's no way to ask the user to confirm here, so nothing was changed.`);

    const approved = takeApproval(turnId, toolName, input);
    if (approved) return run(approved.input as I, runtime);

    const description = await describe(input, userId);
    const pending = await requestConfirmation(threadId, turnId, toolName, input, description);
    return { needsConfirmation: true, pendingActionId: pending.id, action: toolName, description: pending.description, instruction: INSTRUCTION };
  };
}

/** A title short enough to sit in a one-line description. */
export function shortTitle(title: string | null | undefined): string {
  const clean = (title ?? "").replace(/\s+/g, " ").trim() || "Untitled";
  return clean.length > 80 ? `${clean.slice(0, 80)}…` : clean;
}

/** A date and time as the user would read it, in their own time zone. */
export async function whenText(userId: string, iso: string): Promise<string> {
  const timeZone = await userTimeZone(userId);
  return new Intl.DateTimeFormat("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone }).format(new Date(iso));
}
