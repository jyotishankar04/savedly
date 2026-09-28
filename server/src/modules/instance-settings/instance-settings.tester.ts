import { randomUUID } from "node:crypto";
import { Index } from "@upstash/vector";
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { AiCredentialProvider } from "../../db/enums";
import { createS3Driver, localDriver, type S3Settings } from "../../shared/storage";
import { createTransport, type SmtpSettings } from "../../shared/mailer/mailer";
import { testEmbeddingsCredential } from "../ai/ai.providers";
import type { SectionId } from "./instance-settings.registry";
import type { ResolvedSection } from "./instance-settings.service";

/**
 * Admin -> Infrastructure's "Test connection": exercises the candidate
 * settings (the form's values merged over what's saved) against the real
 * service, before anything is saved. Throws with a readable message on failure.
 */
export async function testSection(id: SectionId, settings: ResolvedSection): Promise<string> {
  switch (id) {
    case "storage": {
      const driver = settings.driver === "s3" ? createS3Driver(settings as unknown as S3Settings) : localDriver;
      const key = `${randomUUID()}.txt`;
      const body = Buffer.from("SaveForLatter connection test");
      await driver.write(key, body, "text/plain");
      const read = await driver.read(key);
      await driver.delete(key);
      if (!read.equals(body)) throw new Error("Wrote a test file but read back different bytes.");
      return settings.driver === "s3" ? "Wrote, read and deleted a test file in the bucket." : "Local disk is writable.";
    }
    case "vector": {
      if (settings.provider === "upstash") {
        const index = new Index({ url: String(settings.upstashUrl), token: String(settings.upstashToken) });
        const info = await index.info();
        return `Connected to Upstash (${info.vectorCount} vectors, ${info.dimension} dimensions).`;
      }
      const result = await db.execute(sql`select extversion from pg_extension where extname = 'vector'`);
      if (!result.rows.length) throw new Error("The pgvector extension isn't installed in this database.");
      return `pgvector ${String(result.rows[0].extversion)} is ready.`;
    }
    case "email": {
      if (!settings.enabled) return "Email is off.";
      await createTransport(settings as unknown as SmtpSettings).verify();
      return "Connected to the SMTP server and signed in.";
    }
    case "embeddings": {
      if (!settings.apiKey) throw new Error("Add an API key first.");
      await testEmbeddingsCredential({
        provider: String(settings.provider) as AiCredentialProvider,
        apiKey: String(settings.apiKey),
        baseUrl: settings.baseUrl ? String(settings.baseUrl) : null,
        model: String(settings.model),
      });
      return "Created a test embedding.";
    }
    default:
      throw new Error("This section has no connection test.");
  }
}
