import { searchMemoriesTool } from "./search-memories";
import { searchMemoriesByDateTool } from "./search-memories-by-date";
import { createCalendarEventTool } from "./create-calendar-event";
import { createMemoryTool } from "./create-memory";
import { updateMemoryTool } from "./update-memory";
import { deleteMemoryTool } from "./delete-memory";
import { createCollectionTool } from "./create-collection";
import { platformHelpTool } from "./platform-help";
import { readMemoryTool } from "./read-memory";
import { findMemoriesTool } from "./find-memories";
import { findRelatedTool } from "./find-related";
import { listCollectionsTool } from "./list-collections";
import { listTagsTool } from "./list-tags";
import { restoreMemoriesTool } from "./restore-memories";
import { updateManyMemoriesTool } from "./update-many-memories";
import { listUpcomingEventsTool } from "./list-upcoming-events";
import { updateEventTool } from "./update-event";
import { removeEventTool } from "./remove-event";

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
  // Find
  readMemoryTool,
  findMemoriesTool,
  findRelatedTool,
  // Organize
  listCollectionsTool,
  listTagsTool,
  restoreMemoriesTool,
  updateManyMemoriesTool,
  // Calendar
  listUpcomingEventsTool,
  updateEventTool,
  removeEventTool,
];

export { ragToolContextSchema, type RAGToolContext } from "./search-memories";
