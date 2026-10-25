import { StateSchema, MessagesValue } from "@langchain/langgraph";
import { z } from "zod";

// Message-array state, unlike ingestion's named fields: a tool loop's state is a growing message
// list, as ToolNode expects.
export const RAGState = new StateSchema({
  messages: MessagesValue,
  // Caps the checkGrounding -> Agent retry loop at one retry (see graph.ts).
  retryCount: z.number().default(0),
  // Set by checkGrounding, read by routeAfterGrounding. Defaults true so a run that skips it doesn't loop.
  grounded: z.boolean().default(true),
  // Set by frontDesk, read by routeAfterFrontDesk; always overwritten each turn, so no reset needed
  // (unlike retryCount).
  inScope: z.boolean().default(true),
});

export type RAGStateType = typeof RAGState.State;
export type RAGUpdate = typeof RAGState.Update;
