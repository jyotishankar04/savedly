import { AIMessage, SystemMessage } from "@langchain/core/messages";
import type { GraphNode } from "@langchain/langgraph";
import { getChatModel, platformCredential } from "../../ai.providers";
import { AiRole } from "../../../../db/enums";
import { planHasManagedAi } from "../../../plans/plans.service";
import { withUsage } from "../../../ai-usage/usage-logger";
import { tools } from "../tools";
import { AGENT_SYSTEM_PROMPT } from "../prompts";
import type { RAGState } from "../state";
import { localDate, localNow, userTimeZone, utcOffset } from "../../../../shared/utils/time-zone";

const NOT_CONFIGURED_MESSAGE =
  "I don't have an AI provider configured for this account yet. Add your own API key under Settings → AI to start asking questions.";

const INCLUDED_AI_USED_UP_MESSAGE =
  "You've used this month's included questions. Add your own API key under Settings → AI to keep asking right away, or upgrade your plan for more.";

// Hosted, where AI is always ours: the server's AI isn't set up (or is down).
const MANAGED_AI_UNAVAILABLE_MESSAGE = "Ask isn't available right now. Please try again in a little while.";

const MANAGED_AI_USED_UP_MESSAGE =
  "You've used this month's included questions. They reset at the start of next month; you can also move to a bigger plan in Settings → Plan & usage.";

/**
 * Why Ask can't answer right now, in the user's terms: the plan's included
 * questions are spent, or AI isn't available at all. Also used by streamAsk
 * to reply before running the graph, since a fixed message returned from a
 * node never reaches the client stream (only model output is streamed).
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

export const agentNode: GraphNode<typeof RAGState> = async (state, config) => {
  // userId travels via LangGraph's `context` (set at streamAsk's invocation),
  // not RAGState — it's per-turn identity, not checkpointed conversation state.
  const userId = (config.context as { userId?: string } | undefined)?.userId ?? null;
  const threadId = (config.configurable as { thread_id?: string } | undefined)?.thread_id ?? null;

  const model = userId ? await getChatModel(userId, "reasoning", { kind: "ask", threadId }) : null;
  if (!model) {
    return { messages: [new AIMessage(await askUnavailableMessage(userId))] };
  }
  // bindTools is typed optional on BaseChatModel (not every implementation
  // supports tool calling) — every concrete model getChatModel can return
  // (ChatOpenAI, ChatGroq, ChatAnthropic) does, so this is a safe non-null
  // assertion.
  const modelWithTools = model.bindTools!(tools);

  // Computed per-invocation (not baked into the static prompt string) so
  // "today" is always the actual day the turn runs on — search_memories_by_date
  // needs this to resolve relative terms like "yesterday" or "last week"
  // into the absolute YYYY-MM-DD it requires.
  // In the user's own time zone, so "tomorrow at 3pm" and "yesterday" mean
  // what they mean where the user is.
  const timeZone = userId ? await userTimeZone(userId) : "UTC";
  const today = localDate(timeZone);
  const systemPrompt = `${AGENT_SYSTEM_PROMPT}\n\nToday's date is ${today} (right now it's ${localNow(timeZone)}; the user's time zone is ${timeZone}). A time the user gives without a zone is in their time zone: write datetimes with its offset, e.g. ${today}T15:00:00${utcOffset(timeZone)}.`;

  const response = await modelWithTools.invoke(
    [new SystemMessage(systemPrompt), ...state.messages],
    withUsage(config, { userId, requestType: "rag:agent", threadId }),
  );
  return { messages: [response] };
};
