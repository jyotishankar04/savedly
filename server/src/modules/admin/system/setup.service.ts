import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { instanceSettings } from "../../../db/schema";
import { AiRole } from "../../../db/enums";
import { env } from "../../../config/env";
import { AppError } from "../../../shared/errors/app-error";
import { getSection } from "../../instance-settings/instance-settings.service";
import { getOAuthCredentials } from "../../auth/oauth-config";
import { platformCredential, platformEmbeddingsCredential } from "../../ai/ai.providers";

// What a new self-hosted install still has to decide, for the setup panel in
// the dashboard. AI is the one thing an install can't do without; the others
// already work with a default (files on this disk, no email, password
// sign-in), so the admin either sets them up or says the default is fine.

export const SETUP_ITEMS = ["ai", "storage", "email", "signIn"] as const;
export type SetupItemId = (typeof SETUP_ITEMS)[number];

const REQUIRED: ReadonlySet<SetupItemId> = new Set(["ai"]);

// Which defaults the admin has accepted. Kept in the settings table under its
// own key; it isn't a section in the registry, so no form is drawn for it.
const SKIPS_ROW = "setup";

async function readSkips(): Promise<Partial<Record<SetupItemId, boolean>>> {
  const [row] = await db.select({ value: instanceSettings.value }).from(instanceSettings).where(eq(instanceSettings.section, SKIPS_ROW)).limit(1);
  return ((row?.value as { skipped?: Partial<Record<SetupItemId, boolean>> } | undefined)?.skipped ?? {});
}

async function isDone(item: SetupItemId): Promise<boolean> {
  switch (item) {
    case "ai":
      // Summaries and Ask need a model; search by meaning needs embeddings.
      // An OpenAI key covers both by itself (see platformEmbeddingsCredential).
      return !!(await platformCredential(AiRole.REASONING)) && !!(await platformEmbeddingsCredential());
    case "storage":
      return (await getSection("storage")).driver === "s3";
    case "email":
      return !!(await getSection("email")).enabled;
    case "signIn":
      return !!(await getOAuthCredentials("google")) || !!(await getOAuthCredentials("github"));
  }
}

export interface SetupStatus {
  /** Nothing left for the admin to decide. Always true on the hosted service. */
  complete: boolean;
  items: { id: SetupItemId; required: boolean; done: boolean; skipped: boolean }[];
}

export async function getSetupStatus(): Promise<SetupStatus> {
  if (!env.SELF_HOSTED) return { complete: true, items: [] };
  const skips = await readSkips();
  const items = await Promise.all(
    SETUP_ITEMS.map(async (id) => {
      const required = REQUIRED.has(id);
      return { id, required, done: await isDone(id), skipped: !required && !!skips[id] };
    }),
  );
  return { complete: items.every((item) => item.done || item.skipped), items };
}

/** Whether AI works on this install, for telling people who can't fix it why it doesn't. */
export async function isAiReady(): Promise<boolean> {
  return !env.SELF_HOSTED || (await isDone("ai"));
}

export async function setSetupSkipped(item: SetupItemId, skipped: boolean, adminUserId: string): Promise<SetupStatus> {
  if (REQUIRED.has(item)) throw new AppError("This step can't be skipped.", 400, "SETUP_STEP_REQUIRED");
  const value = { skipped: { ...(await readSkips()), [item]: skipped } };
  await db
    .insert(instanceSettings)
    .values({ section: SKIPS_ROW, value, updatedBy: adminUserId })
    .onConflictDoUpdate({ target: instanceSettings.section, set: { value, updatedBy: adminUserId } });
  return getSetupStatus();
}
