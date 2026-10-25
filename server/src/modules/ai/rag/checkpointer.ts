import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { env } from "../../../config/env";

export const checkpointer = PostgresSaver.fromConnString(env.DATABASE_URL);

let setupDone = false;

/** Creates LangGraph's own checkpoint tables on first call; separate infra, not a drizzle migration. */
export async function ensureCheckpointerSetup(): Promise<void> {
  if (setupDone) return;
  await checkpointer.setup();
  setupDone = true;
}
