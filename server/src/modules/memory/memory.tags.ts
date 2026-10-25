import { and, eq, inArray } from "drizzle-orm";
import { tags } from "../../db/schema";
import type { Tx } from "./memory.types";

export async function resolveTagIds(tx: Tx, userId: string, tagNames: string[]): Promise<string[]> {
  const uniqueNames = [...new Set(tagNames.map((name) => name.trim()).filter(Boolean))];
  if (uniqueNames.length === 0) return [];

  await tx
    .insert(tags)
    .values(uniqueNames.map((name) => ({ userId, name })))
    .onConflictDoNothing({ target: [tags.userId, tags.name] });

  const rows = await tx
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.userId, userId), inArray(tags.name, uniqueNames)));

  return rows.map((row) => row.id);
}
