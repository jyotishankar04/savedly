import { StateGraph, START, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { AIMessage } from "@langchain/core/messages";
import { RAGState } from "./state";
import { frontDeskNode, routeAfterFrontDesk } from "./nodes/front-desk";
import { agentNode } from "./nodes/agent";
import { checkGroundingNode, routeAfterGrounding } from "./nodes/check-grounding";
import { tools } from "./tools";
import { checkpointer } from "./checkpointer";

function shouldContinue(state: typeof RAGState.State): "tools" | "checkGrounding" {
  const lastMessage = state.messages.at(-1);
  if (lastMessage && AIMessage.isInstance(lastMessage) && lastMessage.tool_calls?.length) {
    return "tools";
  }
  return "checkGrounding";
}

// frontDesk gates every turn: an irrelevant request is declined and the graph ends (nodes/front-desk.ts).
// Agent <-> ToolNode is the extensible loop (a tool is a file in tools/ plus one registry entry);
// checkGrounding keeps answers about saved data honest.
const builder = new StateGraph(RAGState)
  .addNode("frontDesk", frontDeskNode)
  .addNode("agent", agentNode)
  .addNode("tools", new ToolNode(tools))
  .addNode("checkGrounding", checkGroundingNode)
  .addEdge(START, "frontDesk")
  .addConditionalEdges("frontDesk", routeAfterFrontDesk, {
    agent: "agent",
    __end__: END,
  })
  .addConditionalEdges("agent", shouldContinue, {
    tools: "tools",
    checkGrounding: "checkGrounding",
  })
  .addEdge("tools", "agent")
  .addConditionalEdges("checkGrounding", routeAfterGrounding, {
    agent: "agent",
    __end__: END,
  });

export const compiledRagGraph = builder.compile({ checkpointer });
