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
import { searchWebTool } from "./search-web";
import { setReminderTool } from "./set-reminder";

// A new tool is a file plus one entry here, with no graph changes (see nodes/agent.ts).
export const tools = [
  searchMemoriesTool,
  searchMemoriesByDateTool,
  createCalendarEventTool,
  createMemoryTool,
  updateMemoryTool,
  deleteMemoryTool,
  createCollectionTool,
  platformHelpTool,
  readMemoryTool,
  findMemoriesTool,
  findRelatedTool,
  listCollectionsTool,
  listTagsTool,
  restoreMemoriesTool,
  updateManyMemoriesTool,
  listUpcomingEventsTool,
  updateEventTool,
  removeEventTool,
  setReminderTool,
  searchWebTool,
];

export { ragToolContextSchema, type RAGToolContext } from "./search-memories";
