# Ask assistant

This page describes the RAG (Retrieval-Augmented Generation) assistant architecture. Use this as a reference before modifying the AI agent, adding tools, or changing prompts.

See [Ask agent (RAG)](../ARCHITECTURE.md#ask-agent-rag) for the LangGraph design and tool list.

The following table lists the owners for each Ask assistant concern:

| Concern | Owner |
|---|---|
| Thread CRUD and streaming a turn | `server/src/modules/ai/ai.service.ts`, mounted at `/api/v1/ai/threads` |
| Tools | `server/src/modules/ai/rag/tools/` |
| System prompts | `server/src/modules/ai/rag/prompts.ts` |
| Client chat UI (full page) | `client/app/(platfrom)/app/ask/page.tsx` |
| Client chat UI (floating widget) | `client/components/ask-widget/ask-widget.tsx` — a lighter surface (no thread history, no sources panel); both write to the same threads |

The full page and the floating widget are mutually exclusive by design: the widget hides itself on `/app/ask`, because the full page already provides that experience.
