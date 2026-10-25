import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { GraphNode } from "@langchain/langgraph";
import { z } from "zod";
import { getChatModel } from "../../models";
import { withUsage } from "../../../ai-usage/api";
import { FRONT_DESK_CLASSIFY_PROMPT, FRONT_DESK_DECLINE_PROMPT } from "../prompts";
import { RAGState, type RAGStateType } from "../state";
import { INTERNAL_EVENT_TAG } from "../internal-tag";
import { turnIsConfirmation } from "../tools/confirm";

const classifySchema = z.object({ inScope: z.boolean() });

/**
 * A cheap gate: off-topic requests ("write me a poem") get a decline instead of reaching the agent,
 * whose prompt only guards against fabricating about saved content. Two calls so the decline
 * streams like agentNode's replies (see check-grounding.ts).
 */
export const frontDeskNode: GraphNode<typeof RAGState> = async (state, config) => {
  const lastMessage = state.messages.at(-1);
  const query = lastMessage && HumanMessage.isInstance(lastMessage) && typeof lastMessage.content === "string" ? lastMessage.content : "";
  if (!query) return { inScope: true };

  const userId = (config.context as { userId?: string } | undefined)?.userId ?? null;
  const threadId = (config.configurable as { thread_id?: string } | undefined)?.thread_id ?? null;

  // No AI configured: skip this pre-filter and let agentNode be the one place that says "connect
  // your AI key".
  if (!userId) return { inScope: true };
  // "Yes" to a question Ask asked (confirm.ts) belongs to that request, not a new off-topic message.
  if (turnIsConfirmation((config.context as { turnId?: string } | undefined)?.turnId)) return { inScope: true };
  const classifyModel = (await getChatModel(userId, "fast", { kind: "ask", threadId }))?.withStructuredOutput(classifySchema);
  if (!classifyModel) return { inScope: true };

  const prompt = FRONT_DESK_CLASSIFY_PROMPT.replace("{query}", () => query);
  // Tagged internal so this classifier call never leaks into the client stream.
  const { inScope } = await classifyModel.invoke(
    prompt,
    withUsage(config, { userId, requestType: "rag:front_desk_classify", threadId }, { tags: [INTERNAL_EVENT_TAG] }),
  );
  if (inScope) return { inScope: true };

  const declineModel = await getChatModel(userId, "fast", { kind: "ask", threadId });
  if (!declineModel) return { inScope: true };
  const decline = await declineModel.invoke(
    [new SystemMessage(FRONT_DESK_DECLINE_PROMPT), ...state.messages],
    withUsage(config, { userId, requestType: "rag:front_desk_decline", threadId }),
  );
  return { inScope: false, messages: [decline as AIMessage] };
};

export function routeAfterFrontDesk(state: RAGStateType): "agent" | "__end__" {
  return state.inScope ? "agent" : "__end__";
}
