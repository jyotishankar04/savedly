import { AIMessage, SystemMessage, ToolMessage, type BaseMessage } from "@langchain/core/messages";
import type { GraphNode } from "@langchain/langgraph";
import { getChatModel } from "../../models";
import { platformCredential } from "../../credentials";
import { AiRole } from "../../../../db/enums";
import { planHasManagedAi } from "../../../plans/api";
import { withUsage } from "../../../ai-usage/api";
import { tools } from "../tools";
import { webSearchAvailable } from "../../web-search/web-search";
import { isConfirmationRequest, turnConfirmation } from "../tools/confirm";
import { wrapUntrusted } from "../../untrusted";
import { AGENT_SYSTEM_PROMPT } from "../prompts";
import type { RAGState } from "../state";
import { localDate, localNow, userTimeZone, utcOffset } from "../../../../shared/utils/time-zone";

// The one tool whose result is the app's own help text, not the user's library.
const PLATFORM_HELP_TOOL = "get_platform_help";

const NOT_CONFIGURED_MESSAGE =
  "I don't have an AI provider configured for this account yet. Add your own API key under Settings → AI to start asking questions.";

const INCLUDED_AI_USED_UP_MESSAGE =
  "You've used this month's included questions. Add your own API key under Settings → AI to keep asking right away, or upgrade your plan for more.";

// Hosted, where AI is always ours: the server's AI isn't set up (or is down).
const MANAGED_AI_UNAVAILABLE_MESSAGE = "Ask isn't available right now. Please try again in a little while.";

const MANAGED_AI_USED_UP_MESSAGE =
  "You've used this month's included questions. They reset at the start of next month; you can also move to a bigger plan in Settings → Plan & usage.";

/**
 * Why Ask can't answer now, in the user's terms: included questions spent, or no AI. streamAsk also
 * uses it to reply before the graph runs, since a node's fixed message never reaches the stream.
 */
export async function askUnavailableMessage(userId: string | null): Promise<string> {
  // Included AI exists for this role but the plan's allowance is spent (or
  // the plan has none) — say that, rather than implying nothing is set up.
  const quotaIsTheReason = !!userId && !!(await platformCredential(AiRole.REASONING));
  const managed = !!userId && (await planHasManagedAi(userId));
  return quotaIsTheReason
    ? managed
      ? MANAGED_AI_USED_UP_MESSAGE
      : INCLUDED_AI_USED_UP_MESSAGE
    : managed
      ? MANAGED_AI_UNAVAILABLE_MESSAGE
      : NOT_CONFIGURED_MESSAGE;
}

/**
 * The conversation as the model sees it: tool results from the user's library are fenced as saved
 * content (untrusted.ts). Stored messages and what the client renders are unchanged.
 */
export function fenceToolResults(messages: BaseMessage[]): BaseMessage[] {
  return messages.map((message) => {
    if (!ToolMessage.isInstance(message)) return message;
    // Our own text, not the user's library: the app's help pages, an error
    // we raised, and the "this needs a yes" answer the model must act on.
    if (message.name === PLATFORM_HELP_TOOL || message.status === "error") return message;
    const text = typeof message.content === "string" ? message.content : JSON.stringify(message.content);
    if (isConfirmationText(text)) return message;
    return new ToolMessage({
      content: wrapUntrusted(text, `result of ${message.name ?? "tool"}`),
      tool_call_id: message.tool_call_id,
      name: message.name,
      status: message.status,
      id: message.id,
    });
  });
}

function isConfirmationText(text: string): boolean {
  try {
    return isConfirmationRequest(JSON.parse(text));
  } catch {
    return false;
  }
}

/**
 * What the user's own message just settled (tools/confirm.ts). Tool names only: no saved text
 * reaches the system prompt.
 */
function confirmationNote(turnId: string | undefined): string {
  const { approvedTools, cancelled } = turnConfirmation(turnId);
  if (approvedTools.length) {
    return `\n\nThe user's latest message confirmed the action you asked about. Call ${approvedTools.map((t) => `\`${t}\``).join(", ")} again now, once per confirmed action, with the same input as before, then tell them the result. Do not ask again.`;
  }
  if (cancelled) {
    return "\n\nThe user's latest message did not confirm the action you asked about, so it was discarded and nothing was changed. Do not carry it out. Answer what they said instead.";
  }
  return "";
}

export const agentNode: GraphNode<typeof RAGState> = async (state, config) => {
  // userId travels via LangGraph's `context` (set at streamAsk's invocation),
  // not RAGState — it's per-turn identity, not checkpointed conversation state.
  const userId = (config.context as { userId?: string } | undefined)?.userId ?? null;
  const threadId = (config.configurable as { thread_id?: string } | undefined)?.thread_id ?? null;

  const model = userId ? await getChatModel(userId, "reasoning", { kind: "ask", threadId }) : null;
  if (!model) {
    return { messages: [new AIMessage(await askUnavailableMessage(userId))] };
  }
  // bindTools is optional on BaseChatModel, but every model getChatModel returns supports it, so
  // the non-null assertion is safe.
  // search_web is offered only when web search is set up.
  const webOn = await webSearchAvailable();
  const modelWithTools = model.bindTools!(webOn ? tools : tools.filter((t) => t.name !== "search_web"));

  // Computed per invocation so "today" is the actual day, which search_memories_by_date needs to
  // resolve "yesterday" or "last week". In the user's own time zone.
  const timeZone = userId ? await userTimeZone(userId) : "UTC";
  const today = localDate(timeZone);
  const systemPrompt = `${AGENT_SYSTEM_PROMPT}\n\nToday's date is ${today} (right now it's ${localNow(timeZone)}; the user's time zone is ${timeZone}). A time the user gives without a zone is in their time zone: write datetimes with its offset, e.g. ${today}T15:00:00${utcOffset(timeZone)}.`;

  const turnId = (config.context as { turnId?: string } | undefined)?.turnId;
  const response = await modelWithTools.invoke(
    [new SystemMessage(systemPrompt + confirmationNote(turnId)), ...fenceToolResults(state.messages)],
    withUsage(config, { userId, requestType: "rag:agent", threadId }),
  );
  return { messages: [response] };
};
