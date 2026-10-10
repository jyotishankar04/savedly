// What the Ask UI says while each assistant tool runs. Search and Help have
// richer displays of their own (result cards, help buttons); every other
// tool shows one of these lines until it finishes.
// Tools that ask before acting (delete, restore, bulk edits, calendar
// changes) run twice: once to ask, once to act. Their line fits both.
const TOOL_ACTIVITY: Record<string, string> = {
  read_memory: "Reading a memory…",
  find_memories: "Looking through your memories…",
  find_related: "Finding related memories…",
  list_collections: "Checking your collections…",
  list_tags: "Checking your tags…",
  restore_memories: "Working on it…",
  update_many_memories: "Working on it…",
  list_upcoming_events: "Checking your calendar…",
  update_event: "Working on it…",
  remove_event: "Working on it…",
  create_calendar_event: "Working on it…",
  create_memory: "Saving it…",
  update_memory: "Updating the memory…",
  delete_memory: "Working on it…",
  create_collection: "Creating the collection…",
};

/** The "working on it" line for a running tool, or null for tools shown some other way. */
export function toolActivityLabel(toolName: string): string | null {
  return TOOL_ACTIVITY[toolName] ?? null;
}
