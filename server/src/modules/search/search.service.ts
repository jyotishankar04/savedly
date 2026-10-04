import { and, eq, gte, lte, or, not, ilike, desc, asc, sql } from "drizzle-orm";
import { db } from "../../db";
import { memories } from "../../db/schema";
import type { AdvancedSearchInput } from "./search.schema";

// Simple Boolean search parser: supports "word1 AND word2", "word1 OR word2", "(word1 AND word2) OR word3", NOT word
function tokenizeQuery(query: string): Array<{ type: string; value: string }> {
  const tokens: Array<{ type: string; value: string }> = [];
  const regex = /\(|\)|AND|OR|NOT|"[^"]+"|[^\s()]+/gi;
  let match;

  while ((match = regex.exec(query)) !== null) {
    const token = match[0].toUpperCase();
    if (token === "(") tokens.push({ type: "lparen", value: "(" });
    else if (token === ")") tokens.push({ type: "rparen", value: ")" });
    else if (token === "AND") tokens.push({ type: "and", value: "AND" });
    else if (token === "OR") tokens.push({ type: "or", value: "OR" });
    else if (token === "NOT") tokens.push({ type: "not", value: "NOT" });
    else tokens.push({ type: "word", value: match[0] });
  }

  return tokens;
}

// Parse Boolean query into an SQL WHERE condition tree
function parseQueryToCondition(query: string): any {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return null;

  let pos = 0;

  function parseOr(): any {
    let left = parseAnd();
    while (pos < tokens.length && tokens[pos]?.type === "or") {
      pos++;
      const right = parseAnd();
      left = or(left, right);
    }
    return left;
  }

  function parseAnd(): any {
    let left = parseNotOrPrimary();
    while (pos < tokens.length && tokens[pos]?.type === "and") {
      pos++;
      const right = parseNotOrPrimary();
      left = and(left, right);
    }
    return left;
  }

  function parseNotOrPrimary(): any {
    if (tokens[pos]?.type === "not") {
      pos++;
      return not(parseNotOrPrimary());
    }
    return parsePrimary();
  }

  function parsePrimary(): any {
    if (tokens[pos]?.type === "lparen") {
      pos++;
      const expr = parseOr();
      pos++; // skip rparen
      return expr;
    }

    // Word token — full-text search in title, content, description
    const token = tokens[pos];
    pos++;
    const searchTerm = `%${token.value.replace(/"/g, "")}%`;
    return or(
      ilike(memories.title, searchTerm),
      ilike(memories.content, searchTerm),
      ilike(memories.description, searchTerm)
    );
  }

  return parseOr();
}

export interface SearchResult {
  id: string;
  title: string;
  content: string | null;
  description: string | null;
  type: string;
  favorite: boolean;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  hasMore: boolean;
}

export async function advancedSearch(userId: string, input: AdvancedSearchInput): Promise<SearchResponse> {
  const conditions: any[] = [eq(memories.userId, userId)];

  // Boolean query search
  if (input.query) {
    const queryCondition = parseQueryToCondition(input.query);
    if (queryCondition) conditions.push(queryCondition);
  }

  // Date range filter
  if (input.dateFrom) {
    conditions.push(gte(memories.createdAt, new Date(input.dateFrom)));
  }
  if (input.dateTo) {
    conditions.push(lte(memories.createdAt, new Date(input.dateTo)));
  }

  // Property filters
  if (input.archived !== undefined) {
    conditions.push(eq(memories.isArchived, input.archived));
  }
  if (input.favorite !== undefined) {
    conditions.push(eq(memories.isFavorite, input.favorite));
  }
  if (input.vaulted !== undefined) {
    conditions.push(eq(memories.isVaulted, input.vaulted));
  }
  if (input.inTrash !== undefined) {
    conditions.push(eq(memories.inTrash, input.inTrash));
  }

  // Apply sorting
  let orderByClause = desc(memories.createdAt);
  if (input.sortBy === "recent" || input.sortBy === "oldest") {
    orderByClause = input.sortOrder === "asc" ? asc(memories.createdAt) : desc(memories.createdAt);
  } else if (input.sortBy === "updated") {
    orderByClause = input.sortOrder === "asc" ? asc(memories.updatedAt) : desc(memories.updatedAt);
  } else if (input.sortBy === "title") {
    orderByClause = input.sortOrder === "asc" ? asc(memories.title) : desc(memories.title);
  }

  // Build and execute query
  const results = await db
    .select()
    .from(memories)
    .where(and(...conditions))
    .orderBy(orderByClause)
    .limit((input.limit ?? 20) + 1)
    .offset(input.offset ?? 0);

  // Get total count for this query
  const [{ count: total }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(memories)
    .where(and(...conditions));

  const hasMore = results.length > (input.limit ?? 20);
  const paginatedResults = results.slice(0, input.limit ?? 20);

  return {
    results: paginatedResults.map((m) => ({
      id: m.id,
      title: m.title,
      content: m.content,
      description: m.description,
      type: m.type,
      favorite: m.isFavorite,
      archived: m.isArchived,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    })),
    total: Number(total),
    hasMore,
  };
}
