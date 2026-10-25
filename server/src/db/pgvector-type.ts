import { customType } from "drizzle-orm/pg-core";

// text-embedding-3-small — keep the schema and the embeddings client in sync.
export const EMBEDDING_DIMENSIONS = 1536;

// drizzle has no pgvector type; the wire format is a string like "[0.1,0.2]", not JSON.
export const vector = (name: string, dimensions: number) =>
  customType<{ data: number[] }>({
    dataType() {
      return `vector(${dimensions})`;
    },
    toDriver(value) {
      return `[${value.join(",")}]`;
    },
    fromDriver(value) {
      return (value as string)
        .slice(1, -1)
        .split(",")
        .map(Number);
    },
  })(name);

// Filled by a DB trigger, never the app; the type only makes the column appear in generated migrations.
export const tsvector = (name: string) =>
  customType<{ data: string }>({
    dataType() {
      return "tsvector";
    },
  })(name);
