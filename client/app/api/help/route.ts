import { CATEGORIES, GUIDES, TOOLS } from "@/lib/help-content";

// The Help Center as JSON, read by the API server's Ask assistant
// (server/src/modules/ai/rag/tools/platform-help.ts) so it answers "how do I…"
// questions from these same guides. One source of truth: editing a guide
// updates the Help Center pages and the assistant together.
export const dynamic = "force-static";

export function GET() {
  return Response.json({
    categories: CATEGORIES,
    guides: GUIDES.map(({ slug, category, title, summary, intro, steps, actions }) => ({
      slug,
      category,
      title,
      summary,
      intro,
      steps: steps.map(({ title, body }) => ({ title, body })),
      actions: actions ?? [],
      href: `/help/${slug}`,
    })),
    tools: TOOLS.map(({ slug, category, title, summary, href }) => ({ slug, category, title, summary, href })),
  });
}
