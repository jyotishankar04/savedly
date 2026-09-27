import { searchMemoriesTool } from "./search-memories";
import { searchMemoriesByDateTool } from "./search-memories-by-date";
import { createCalendarEventTool } from "./create-calendar-event";
import { createMemoryTool } from "./create-memory";
import { updateMemoryTool } from "./update-memory";
import { deleteMemoryTool } from "./delete-memory";
import { createCollectionTool } from "./create-collection";
import { platformHelpTool } from "./platform-help";

// Adding a future tool is a new file + one entry here — no graph changes
// needed (see nodes/agent.ts).
export const tools = [
  searchMemoriesTool,
  searchMemoriesByDateTool,
  createCalendarEventTool,
  createMemoryTool,
  updateMemoryTool,
  deleteMemoryTool,
  createCollectionTool,
  platformHelpTool,
];

export { ragToolContextSchema, type RAGToolContext } from "./search-memories";
