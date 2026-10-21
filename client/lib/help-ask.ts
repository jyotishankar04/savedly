import { API_URL } from "@/lib/auth";

// The help box: a visitor's own question about Savedly, answered by the server
// from the Help Center's guides (server/src/modules/help-assistant), written
// out as it arrives. Used by the FAQ section and the floating help button.

/** The longest question the server takes. */
export const MAX_QUESTION = 300;

export interface HelpAnswer {
  answer: string;
  answered: boolean;
  links: { label: string; href: string }[];
}

/** A reason we wrote ourselves and can show. Anything else (no network, a timeout) gets the general message. */
export class HelpError extends Error {}

/**
 * Asks the question and calls `onText` with the answer so far, each time more
 * of it arrives. Resolves with the finished answer and its links.
 */
export async function askHelp(question: string, signal: AbortSignal, onText: (soFar: string) => void): Promise<HelpAnswer> {
  const res = await fetch(`${API_URL}/help/ask`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "text/event-stream" },
    body: JSON.stringify({ question }),
    signal,
  });
  if (!res.ok || !res.body) {
    const body = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
    if (res.status === 429) {
      throw new HelpError(body?.error?.code === "HELP_BUSY" ? (body.error.message ?? "") : "That's a lot of questions in a short time. Give it a minute and try again.");
    }
    throw new HelpError(body?.error?.code === "HELP_UNAVAILABLE" && body.error.message ? body.error.message : "");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let done: HelpAnswer | null = null;
  for (;;) {
    const { value, done: finished } = await reader.read();
    if (finished) break;
    buffer += decoder.decode(value, { stream: true });
    // Events are separated by a blank line; the last piece may be half an event.
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const raw of events) {
      const line = raw.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      const event = JSON.parse(line.slice(6)) as { type: "delta"; text: string } | ({ type: "done" } & HelpAnswer) | { type: "error"; message?: string };
      if (event.type === "delta") {
        text += event.text;
        onText(text);
      } else if (event.type === "done") {
        done = { answer: event.answer, answered: event.answered, links: event.links };
      } else {
        throw new HelpError(event.message ?? "");
      }
    }
  }
  if (!done) throw new HelpError("");
  return done;
}
