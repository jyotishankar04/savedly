import "dotenv/config";
import { asc, eq } from "drizzle-orm";
import { db } from "./index";
import { collectionMemories, collections, memories, memoryTags, tags, users } from "./schema";
import { MemoryType } from "./enums";
import { seedCore } from "./seed-core";

// Sample memories are seeded against whichever real account signed up first.
// Sign in once (and complete onboarding), then run this.
async function seedMemories() {
  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .orderBy(asc(users.createdAt))
    .limit(1);

  if (!user) {
    console.log("No users found yet — sign in once via OAuth, then re-run `pnpm db:seed` to populate sample memories.");
    return;
  }

  const [existing] = await db
    .select({ id: memories.id })
    .from(memories)
    .where(eq(memories.userId, user.id))
    .limit(1);

  if (existing) {
    console.log(`Memories already seeded for ${user.email}, skipping.`);
    return;
  }

  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 60 * 60 * 1000);
  const daysAgo = (d: number) => new Date(now - d * 24 * 60 * 60 * 1000);

  const collectionDefs = [
    {
      key: "saas",
      name: "SaaS Inspiration",
      icon: "🚀",
      description: "Websites, user dashboards, pricing lists, and landing page references.",
    },
    {
      key: "ai",
      name: "AI Research",
      icon: "🤖",
      description: "Material on RAG architectures, LLM prompts, agent memory, and vector comparison tests.",
    },
    {
      key: "design",
      name: "Design",
      icon: "🎨",
      description: "Color sets, card grids, typography layouts, and minimal aesthetic references.",
    },
    {
      key: "learning",
      name: "Learning",
      icon: "📚",
      description: "Tutorial videos, code repository guides, and tech documentation summaries.",
    },
  ] as const;

  const insertedCollections = await db
    .insert(collections)
    .values(
      collectionDefs.map((c) => ({
        userId: user.id,
        name: c.name,
        icon: c.icon,
        description: c.description,
      })),
    )
    .returning({ id: collections.id });

  const collectionIdByKey: Record<string, string> = {};
  collectionDefs.forEach((def, i) => {
    collectionIdByKey[def.key] = insertedCollections[i].id;
  });

  const tagNames = [
    "Design",
    "SaaS",
    "AI",
    "Development",
    "Research",
    "Productivity",
    "Learning",
    "Video",
    "Tools",
    "Inspiration",
  ];

  const insertedTags = await db
    .insert(tags)
    .values(tagNames.map((name) => ({ userId: user.id, name })))
    .returning({ id: tags.id, name: tags.name });

  const tagIdByName: Record<string, string> = {};
  insertedTags.forEach((tag) => {
    tagIdByName[tag.name] = tag.id;
  });

  interface SeedMemory {
    type: MemoryType;
    title: string;
    description: string;
    url?: string;
    source?: string;
    content?: string;
    tags: string[];
    collection?: keyof typeof collectionIdByKey;
    createdAt: Date;
    isFavorite?: boolean;
    isArchived?: boolean;
    inTrash?: boolean;
  }

  const memoryDefs: SeedMemory[] = [
    {
      type: MemoryType.WEB,
      title: "Linear Dashboard",
      description: "SaaS Dashboard inspiration. Clean sidebar navigation, custom dark colors, shortcuts helper.",
      url: "https://linear.app/features",
      source: "linear.app/features",
      tags: ["Design", "SaaS"],
      collection: "saas",
      createdAt: hoursAgo(2),
      isFavorite: true,
    },
    {
      type: MemoryType.VIDEO,
      title: "Building a SaaS in 2026",
      description: "Under the hood of monorepos, vector indexers, and local-first billing configurations.",
      url: "https://youtube.com/watch?v=saas2026",
      source: "youtube.com",
      tags: ["Development", "SaaS"],
      collection: "saas",
      createdAt: hoursAgo(4),
    },
    {
      type: MemoryType.NOTE,
      title: "Memora duplicate saves idea",
      description: "What if Memora could automatically detect duplicate saves and merge summaries together?",
      content: "Hash content + compare embeddings to catch near-duplicate saves before they clutter the list.",
      tags: ["AI"],
      collection: "ai",
      createdAt: hoursAgo(20),
    },
    {
      type: MemoryType.IMAGE,
      title: "SaaS Pricing UI Reference",
      description: "Screenshot showing clean card grids, pricing models in local currency, and subtle border dividers.",
      source: "screenshot_pricing.png",
      tags: ["Design", "SaaS"],
      collection: "design",
      createdAt: daysAgo(2),
      isFavorite: true,
    },
    {
      type: MemoryType.DOCUMENT,
      title: "Vector DB Performance Comparison",
      description: "Research summary logging latency checks of pgvector vs Pinecone vs Qdrant.",
      source: "vector_db_sheet.pdf",
      tags: ["AI", "Research"],
      collection: "ai",
      createdAt: daysAgo(4),
      isFavorite: true,
    },
    {
      type: MemoryType.WEB,
      title: "Raycast Store",
      description: "Clean layout of extension grid, detailed sidebar specifications, and keyboard navigation.",
      url: "https://raycast.com/store",
      source: "raycast.com/store",
      tags: ["Design", "Productivity"],
      collection: "design",
      createdAt: daysAgo(20),
    },
    {
      type: MemoryType.WEB,
      title: "Stripe Pricing Page",
      description: "Minimal pricing table with annual/monthly toggle and clear feature comparison.",
      url: "https://stripe.com/pricing",
      source: "stripe.com/pricing",
      tags: ["SaaS", "Design"],
      collection: "saas",
      createdAt: hoursAgo(1),
    },
    {
      type: MemoryType.VIDEO,
      title: "RAG From Scratch",
      description: "Deep dive into retrieval-augmented generation architecture with LangChain examples.",
      url: "https://youtube.com/watch?v=ragfromscratch",
      source: "youtube.com",
      tags: ["AI", "Research", "Video"],
      collection: "ai",
      createdAt: hoursAgo(6),
    },
    {
      type: MemoryType.NOTE,
      title: "Onboarding flow ideas",
      description: "Progressive disclosure onboarding: ask three questions max, skip button always visible.",
      content: "Progressive disclosure onboarding: ask three questions max, skip button always visible.",
      tags: ["Design", "Productivity"],
      collection: "design",
      createdAt: daysAgo(1),
    },
    {
      type: MemoryType.IMAGE,
      title: "Dark Mode Color Palette",
      description: "Accessible dark theme palette with WCAG AA contrast ratios for text and borders.",
      tags: ["Design"],
      collection: "design",
      createdAt: daysAgo(3),
    },
    {
      type: MemoryType.DOCUMENT,
      title: "pgvector vs Pinecone Benchmark",
      description: "Latency and recall benchmarks for a 1M vector dataset across HNSW configurations.",
      source: "pgvector_benchmark.pdf",
      tags: ["AI", "Research"],
      collection: "ai",
      createdAt: daysAgo(5),
      isArchived: true,
    },
    {
      type: MemoryType.WEB,
      title: "Notion Style Guide",
      description: "Typography scale, spacing tokens, and component naming conventions.",
      url: "https://notion.so/style-guide",
      source: "notion.so",
      tags: ["Design", "Inspiration"],
      collection: "design",
      createdAt: daysAgo(10),
    },
    {
      type: MemoryType.VIDEO,
      title: "TypeScript Generics Deep Dive",
      description: "Advanced generic constraints, conditional types, and inference patterns.",
      url: "https://youtube.com/watch?v=tsgenerics",
      source: "youtube.com",
      tags: ["Learning", "Development", "Video"],
      collection: "learning",
      createdAt: daysAgo(12),
    },
    {
      type: MemoryType.NOTE,
      title: "Weekly review template",
      description: "What shipped, what blocked, what to prioritize next week.",
      content: "What shipped, what blocked, what to prioritize next week.",
      tags: ["Productivity"],
      collection: "learning",
      createdAt: daysAgo(8),
    },
    {
      type: MemoryType.DOCUMENT,
      title: "System Design Interview Notes",
      description: "Load balancing, caching strategies, and database sharding patterns.",
      tags: ["Learning", "Development"],
      collection: "learning",
      createdAt: daysAgo(15),
      isArchived: true,
    },
    {
      type: MemoryType.WEB,
      title: "Figma Community Templates",
      description: "Free dashboard and landing page templates with auto-layout.",
      url: "https://figma.com/community",
      source: "figma.com",
      tags: ["Design", "Tools"],
      collection: "design",
      createdAt: daysAgo(18),
    },
    {
      type: MemoryType.IMAGE,
      title: "Mobile Nav Pattern Reference",
      description: "Bottom tab bar vs hamburger menu comparison across popular apps.",
      tags: ["Design", "Inspiration"],
      collection: "design",
      createdAt: daysAgo(22),
    },
    {
      type: MemoryType.VIDEO,
      title: "Postgres Indexing Explained",
      description: "B-tree vs GIN vs GiST indexes and when to use each.",
      url: "https://youtube.com/watch?v=pgindexing",
      source: "youtube.com",
      tags: ["Learning", "Development"],
      collection: "learning",
      createdAt: daysAgo(25),
      inTrash: true,
    },
    {
      type: MemoryType.WEB,
      title: "Vercel AI SDK Docs",
      description: "Streaming responses, tool calling, and structured outputs reference.",
      url: "https://sdk.vercel.ai/docs",
      source: "sdk.vercel.ai",
      tags: ["AI", "Tools", "Development"],
      collection: "ai",
      createdAt: daysAgo(30),
    },
    {
      type: MemoryType.NOTE,
      title: "Tag auto-dedup idea",
      description: "Fuzzy match new tags against existing ones with pg_trgm similarity >= 0.85.",
      content: "Fuzzy match new tags against existing ones with pg_trgm similarity >= 0.85 before creating a new row.",
      tags: ["AI"],
      collection: "ai",
      createdAt: hoursAgo(0.5),
      isFavorite: true,
    },
  ];

  for (const def of memoryDefs) {
    const [row] = await db
      .insert(memories)
      .values({
        userId: user.id,
        type: def.type,
        title: def.title,
        description: def.description,
        url: def.url,
        source: def.source,
        content: def.content,
        isFavorite: def.isFavorite ?? false,
        isArchived: def.isArchived ?? false,
        inTrash: def.inTrash ?? false,
        createdAt: def.createdAt,
        updatedAt: def.createdAt,
      })
      .returning({ id: memories.id });

    if (def.collection) {
      await db
        .insert(collectionMemories)
        .values({ collectionId: collectionIdByKey[def.collection], memoryId: row.id });
    }

    if (def.tags.length > 0) {
      await db
        .insert(memoryTags)
        .values(def.tags.map((name) => ({ memoryId: row.id, tagId: tagIdByName[name] })));
    }
  }

  console.log(
    `Seeded ${memoryDefs.length} memories, ${collectionDefs.length} collections, ${tagNames.length} tags for ${user.email}.`,
  );
}

async function seed() {
  await seedCore();
  console.log("Seeded roles, feature flags and plans.");
  await seedMemories();
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
