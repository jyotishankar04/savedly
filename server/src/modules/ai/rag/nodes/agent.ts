import { AIMessage, SystemMessage } from "@langchain/core/messages";
import type { GraphNode } from "@langchain/langgraph";
import { getChatModel } from "../../ai.providers";
import { withUsage } from "../../../ai-usage/usage-logger";
import { tools } from "../tools";
import { AGENT_SYSTEM_PROMPT } from "../prompts";
import type { RAGState } from "../state";

const NOT_CONFIGURED_MESSAGE =
  "I don't have an AI provider configured for this account yet. Add your own API key under Settings → AI to start asking questions.";

export const agentNode: GraphNode<typeof RAGState> = async (state, config) => {
  // userId travels via LangGraph's `context` (set at streamAsk's invocation),
  // not RAGState — it's per-turn identity, not checkpointed conversation state.
  const userId = (config.context as { userId?: string } | undefined)?.userId ?? null;
  const threadId = (config.configurable as { thread_id?: string } | undefined)?.thread_id ?? null;

  const model = userId ? await getChatModel(userId, "reasoning") : null;
  if (!model) {
    return { messages: [new AIMessage(NOT_CONFIGURED_MESSAGE)] };
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
  const today = new Date().toISOString().slice(0, 10);
  const systemPrompt = `${AGENT_SYSTEM_PROMPT}\n\nToday's date is ${today}.`;

  const response = await modelWithTools.invoke(
    [new SystemMessage(systemPrompt), ...state.messages],
    withUsage(config, { userId, requestType: "rag:agent", threadId }),
  );
  return { messages: [response] };
};
