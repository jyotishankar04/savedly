import { eq } from "drizzle-orm";
import { db } from "../../db";
import { instanceSettings } from "../../db/schema";
import { env } from "../../config/env";
import { decryptToken, encryptToken } from "../../shared/crypto/token-cipher";
import { AppError } from "../../shared/errors/app-error";
import { logger } from "../../shared/utils/logger";
import { SECTIONS, getSectionDef, type FieldValue, type SectionDef, type SectionId } from "./instance-settings.registry";

export type ResolvedSection = Record<string, FieldValue | undefined>;
export type FieldSource = "env" | "settings" | "default";

interface StoredSection {
  value: Record<string, FieldValue>;
  secrets: Record<string, string>;
}

// One process runs the API and every worker, so an in-memory cache plus a
// version counter is enough: a save bumps the version, and consumers that
// build a client from these settings (storage, vector store, mailer) rebuild
// it the next time they see a new version. Hosted production only reads the
// table for hostedEditable sections — see readStored.
let version = 0;
const cache = new Map<SectionId, StoredSection>();

export function settingsVersion(): number {
  return version;
}

/** Whether the settings table applies to this section on this server. */
function isEditable(def: SectionDef): boolean {
  return env.SELF_HOSTED || !!def.hostedEditable;
}

async function readStored(id: SectionId): Promise<StoredSection> {
  // Hosted production is configured through env, except hostedEditable sections.
  if (!isEditable(getSectionDef(id)!)) return { value: {}, secrets: {} };

  const cached = cache.get(id);
  if (cached) return cached;

  const [row] = await db.select().from(instanceSettings).where(eq(instanceSettings.section, id)).limit(1);
  let secrets: Record<string, string> = {};
  if (row?.secretValue) {
    try {
      secrets = JSON.parse(decryptToken(row.secretValue));
    } catch (err) {
      logger.error({ err, section: id }, "instance-settings: couldn't decrypt stored secrets");
    }
  }
  const stored = { value: (row?.value as Record<string, FieldValue>) ?? {}, secrets };
  cache.set(id, stored);
  return stored;
}

function resolveWithSources(def: SectionDef, stored: StoredSection) {
  const values: ResolvedSection = {};
  const sources: Record<string, FieldSource> = {};
  const base = env.SELF_HOSTED ? def.defaults : { ...def.defaults, ...def.hostedDefaults };

  for (const field of def.fields) {
    const fromEnv = field.fromEnv?.();
    const fromSettings = field.secret ? stored.secrets[field.name] : stored.value[field.name];
    if (fromEnv !== undefined) {
      values[field.name] = fromEnv;
      sources[field.name] = "env";
    } else if (fromSettings !== undefined && fromSettings !== "") {
      values[field.name] = fromSettings;
      sources[field.name] = "settings";
    } else {
      values[field.name] = base[field.name];
      sources[field.name] = "default";
    }
  }
  return { values, sources };
}

/** The effective configuration for one section: env, then settings (self-hosted or hostedEditable), then defaults. */
export async function getSection<T extends ResolvedSection = ResolvedSection>(id: SectionId): Promise<T> {
  const def = getSectionDef(id)!;
  return resolveWithSources(def, await readStored(id)).values as T;
}

/** What the admin Infrastructure page renders. Secret values never leave the server — only whether one is set. */
export async function describeSections() {
  return Promise.all(
    SECTIONS.map(async (def) => {
      const { values, sources } = resolveWithSources(def, await readStored(def.id));
      return {
        id: def.id,
        title: def.title,
        description: def.description,
        testable: def.testable,
        editable: isEditable(def),
        fields: def.fields.map((f) => ({
          name: f.name,
          label: f.label,
          kind: f.kind,
          secret: !!f.secret,
          options: f.options,
          placeholder: f.placeholder,
          help: f.help,
          showWhen: f.showWhen,
          source: sources[f.name],
          value: f.secret ? undefined : values[f.name],
          isSet: f.secret ? values[f.name] !== undefined && values[f.name] !== "" : undefined,
        })),
      };
    }),
  );
}

/**
 * Merges an admin's edit over what's stored, so a form that leaves a secret
 * blank keeps the saved one. For secrets: undefined = keep, "" = clear,
 * anything else = replace. Fields set by env can't be overridden here.
 */
export async function mergeCandidate(id: SectionId, input: Record<string, unknown>): Promise<{ merged: ResolvedSection; next: StoredSection }> {
  const def = getSectionDef(id);
  if (!def) throw new AppError("Unknown settings section", 404, "NOT_FOUND");

  const stored = await readStored(id);
  const next: StoredSection = { value: { ...stored.value }, secrets: { ...stored.secrets } };

  for (const field of def.fields) {
    if (!(field.name in input)) continue;
    if (field.fromEnv?.() !== undefined) continue; // env wins; the page shows it locked
    const raw = input[field.name];
    if (field.secret) {
      if (raw === undefined || raw === null) continue;
      if (raw === "") delete next.secrets[field.name];
      else next.secrets[field.name] = String(raw);
    } else if (raw === null || raw === "") {
      delete next.value[field.name];
    } else {
      next.value[field.name] = raw as FieldValue;
    }
  }

  return { merged: resolveWithSources(def, next).values, next };
}

export async function saveSection(id: SectionId, input: Record<string, unknown>, adminUserId: string) {
  const def = getSectionDef(id)!;
  if (!isEditable(def)) {
    throw new AppError("Infrastructure is configured through environment variables on this server", 409, "SETTINGS_MANAGED_BY_ENV");
  }
  const { merged, next } = await mergeCandidate(id, input);

  const parsed = def.schema.safeParse(merged);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new AppError(issue?.message ?? "Invalid settings", 400, "VALIDATION_ERROR");
  }

  const secretValue = Object.keys(next.secrets).length ? encryptToken(JSON.stringify(next.secrets)) : null;
  await db
    .insert(instanceSettings)
    .values({ section: id, value: next.value, secretValue, updatedBy: adminUserId })
    .onConflictDoUpdate({
      target: instanceSettings.section,
      set: { value: next.value, secretValue, updatedBy: adminUserId, updatedAt: new Date() },
    });

  cache.set(id, next);
  version += 1;
  return { before: null, after: { section: id, fields: Object.keys(next.value) } };
}
