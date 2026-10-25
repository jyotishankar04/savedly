import { count, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { memoryTags, tags } from "../../db/schema";

export interface TagResponse {
  id: string;
  name: string;
  memoryCount: number;
}

// Read-only: tags are created implicitly by resolveTagIds() when a memory is saved or edited with a
// new tag; there's no standalone create.
export async function listTags(userId: string): Promise<TagResponse[]> {
  return db
    .select({
      id: tags.id,
      name: tags.name,
      memoryCount: count(memoryTags.memoryId),
    })
    .from(tags)
    .leftJoin(memoryTags, eq(memoryTags.tagId, tags.id))
    .where(eq(tags.userId, userId))
    .groupBy(tags.id)
    .orderBy(desc(count(memoryTags.memoryId)), tags.name);
}
