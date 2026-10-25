import { StateSchema, MessagesValue } from "@langchain/langgraph";
import { z } from "zod";

// Message-array state, unlike ingestion's named fields: a tool-calling loop's state is a growing
// message list, as LangGraph's ToolNode expects. MessagesValue supplies the reducer.
export const RAGState = new StateSchema({
  messages: MessagesValue,
  // Caps the checkGrounding -> Agent retry loop at one retry (see graph.ts).
  retryCount: z.number().default(0),
  // Set by checkGrounding, read by routeAfterGrounding. Defaults true so a
  // run that never reaches checkGrounding (shouldn't happen, but) doesn't
  // spuriously loop.
  grounded: z.boolean().default(true),
  // Set by frontDesk, read by routeAfterFrontDesk. It's always overwritten at the start of a turn,
  // so unlike retryCount it needs no reset.
  inScope: z.boolean().default(true),
});

export type RAGStateType = typeof RAGState.State;
export type RAGUpdate = typeof RAGState.Update;
