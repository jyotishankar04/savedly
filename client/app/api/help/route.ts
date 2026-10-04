import { CATEGORIES, TOOLS } from "@/lib/help-content";
import { helpDocGuides } from "@/lib/help-docs";

// The Help Center as JSON, read by the API server's Ask assistant
// (server/src/modules/ai/rag/tools/platform-help.ts) so it answers "how do I…"
// questions from these same guides. One source of truth: editing a guide's
// MDX updates the docs pages and the assistant together.
export const dynamic = "force-static";

export function GET() {
  return Response.json({
    categories: CATEGORIES,
    guides: helpDocGuides(),
    tools: TOOLS.map(({ slug, category, title, summary, href }) => ({ slug, category, title, summary, href })),
  });
}
