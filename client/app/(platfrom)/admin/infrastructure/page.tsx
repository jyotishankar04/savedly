"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  getInstanceSettings,
  getReindexStatus,
  startReindex,
  saveInstanceSection,
  testInstanceSection,
  type SettingField,
  type SettingSection,
  type SettingValue,
} from "@/lib/instance-settings";

// Admin -> Infrastructure: file storage, vector store, email, embeddings and
// OAuth for a self-hosted install. Rendered straight from the server's field
// metadata (server/src/modules/instance-settings/instance-settings.registry.ts).
// Hosted production is configured through env, so there only the sections
// marked editable (Included AI) can be changed; the rest are read-only.

export default function AdminInfrastructurePage() {
  const { data, isLoading, isError } = useQuery({ queryKey: ["admin", "instance-settings"], queryFn: getInstanceSettings });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Spinner />
      </div>
    );
  }
  if (isError || !data) {
    return <p className="text-xs text-destructive">Couldn&apos;t load infrastructure settings.</p>;
  }

  return (
    <div className="space-y-8 max-w-xl">
      <div className="space-y-1.5">
        <h1 className="text-lg font-bold text-foreground">Infrastructure</h1>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {data.selfHosted
            ? "Everything works out of the box with local disk, the built-in vector store and no email. Change any of it here. A value set with an environment variable always wins and can't be edited on this page."
            : "This server is configured through environment variables. Included AI can be changed here; everything else is read-only."}
        </p>
      </div>

      {sortSections(data).map((section) => (
        <SectionCard
          key={section.id}
          section={section}
          editable={section.editable}
          callbackUrl={
            section.id === "googleAuth" ? data.callbackUrls.google : section.id === "githubAuth" ? data.callbackUrls.github : undefined
          }
        />
      ))}
    </div>
  );
}

/** On hosted production, the one section you can change goes first. */
function sortSections(data: { selfHosted: boolean; sections: SettingSection[] }): SettingSection[] {
  if (data.selfHosted) return data.sections;
  return [...data.sections.filter((s) => s.editable), ...data.sections.filter((s) => !s.editable)];
}

type Draft = Record<string, SettingValue | null>;

function initialDraft(section: SettingSection): Draft {
  const draft: Draft = {};
  for (const field of section.fields) {
    if (field.secret) continue; // blank means "keep what's saved"
    draft[field.name] = field.value ?? (field.kind === "boolean" ? false : "");
  }
  return draft;
}

function SectionCard({ section, editable, callbackUrl }: { section: SettingSection; editable: boolean; callbackUrl?: string }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(() => initialDraft(section));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<"save" | "test" | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const set = (name: string, value: SettingValue | null) => {
    setDraft((d) => ({ ...d, [name]: value }));
    setDirty(true);
    setResult(null);
  };

  // Only fields the admin can actually change are sent; env-set ones are
  // fixed server-side anyway.
  const payload = (): Draft => {
    const out: Draft = {};
    for (const field of section.fields) {
      if (field.source === "env") continue;
      const value = draft[field.name];
      if (field.secret && (value === undefined || value === "")) continue;
      out[field.name] = field.kind === "number" && value !== "" && value !== null ? Number(value) : (value ?? null);
    }
    return out;
  };

  const visible = (field: SettingField) => {
    if (!field.showWhen) return true;
    const current = draft[field.showWhen.field] ?? section.fields.find((f) => f.name === field.showWhen!.field)?.value;
    return field.showWhen.equals.includes(current as SettingValue);
  };

  const save = async () => {
    setBusy("save");
    try {
      const updated = await saveInstanceSection(section.id, payload());
      setDraft(initialDraft(updated));
      setDirty(false);
      await queryClient.invalidateQueries({ queryKey: ["admin", "instance-settings"] });
      toast.add({ title: `${section.title} saved.`, type: "success" });
    } catch (err) {
      toast.add({ title: err instanceof Error ? err.message : "Couldn't save.", type: "error" });
    } finally {
      setBusy(null);
    }
  };

  const test = async () => {
    setBusy("test");
    setResult(null);
    try {
      setResult(await testInstanceSection(section.id, payload()));
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : "Test failed." });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">{section.title}</h3>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{section.description}</p>
        {callbackUrl && (
          <p className="text-[11px] text-muted-foreground">
            Redirect / callback URL: <code className="font-mono text-foreground break-all">{callbackUrl}</code>
          </p>
        )}
      </div>

      {section.id === "embeddings" && <ReindexPanel />}

      <div className="space-y-3 p-3 border border-border rounded-xl">
        {section.fields.filter(visible).map((field) => (
          <FieldRow key={field.name} field={field} value={draft[field.name]} editable={editable} onChange={(v) => set(field.name, v)} />
        ))}

        {result && (
          <p
            role="status"
            className={cn("flex items-start gap-1.5 text-[11px]", result.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}
          >
            <HugeiconsIcon icon={result.ok ? CheckmarkCircle02Icon : AlertCircleIcon} strokeWidth={2} className="h-3.5 w-3.5 mt-px shrink-0" />
            {result.message}
          </p>
        )}

        {editable && (
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={save}
              disabled={!dirty || busy !== null}
              className="h-7 rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-3.5 hover:bg-primary/90 transition-colors disabled:opacity-40 inline-flex items-center gap-1.5"
            >
              {busy === "save" && <Spinner />}
              Save
            </button>
            {section.testable && (
              <button
                type="button"
                onClick={test}
                disabled={busy !== null}
                className="h-7 rounded-full border border-border text-foreground text-[10px] font-bold px-3.5 hover:bg-muted transition-colors disabled:opacity-40 inline-flex items-center gap-1.5"
              >
                {busy === "test" && <Spinner />}
                Test connection
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function FieldRow({
  field,
  value,
  editable,
  onChange,
}: {
  field: SettingField;
  value: SettingValue | null | undefined;
  editable: boolean;
  onChange: (value: SettingValue | null) => void;
}) {
  const locked = !editable || field.source === "env";
  const id = `setting-${field.name}`;

  const note =
    field.source === "env"
      ? "Set by environment"
      : field.secret && field.isSet
        ? "Saved — leave blank to keep it"
        : field.help;

  if (field.kind === "boolean") {
    return (
      <div className="flex items-start justify-between gap-4">
        <div>
          <label htmlFor={id} className="text-xs font-semibold text-foreground">
            {field.label}
          </label>
          {note && <p className="text-[10px] text-muted-foreground mt-0.5">{note}</p>}
        </div>
        <Switch id={id} checked={Boolean(value)} onCheckedChange={(v) => onChange(v)} disabled={locked} />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
        {field.label}
      </label>
      {field.kind === "select" ? (
        <NativeSelect id={id} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} disabled={locked} className="w-full">
          {field.options?.map((o) => (
            <NativeSelectOption key={o.value} value={o.value}>
              {o.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      ) : (
        <Input
          id={id}
          type={field.kind === "password" ? "password" : field.kind === "number" ? "number" : "text"}
          value={field.secret ? String(value ?? "") : String(value ?? "")}
          placeholder={field.secret && field.isSet ? "••••••••" : field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          disabled={locked}
          autoComplete="off"
          className="h-8 text-xs"
        />
      )}
      {note && <p className="text-[10px] text-muted-foreground">{note}</p>}
    </div>
  );
}

/**
 * Embeddings card: how many memories aren't findable by meaning yet, and a
 * button to index them (embeddings only, so nobody's AI allowance is spent).
 */
function ReindexPanel() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin", "reindex"],
    queryFn: getReindexStatus,
    // Poll while it runs, so the count goes down on its own.
    refetchInterval: (query) => (query.state.data?.running ? 3000 : false),
  });
  const [starting, setStarting] = useState(false);

  if (!data) return null;
  const done = data.exact && data.count === 0;

  const start = async () => {
    setStarting(true);
    try {
      await startReindex();
      await queryClient.invalidateQueries({ queryKey: ["admin", "reindex"] });
    } catch (err) {
      toast.add({ title: err instanceof Error ? err.message : "Couldn't start re-indexing.", type: "error" });
    } finally {
      setStarting(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-[11px]",
        done ? "bg-muted/60 text-muted-foreground" : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
      )}
    >
      <span className="flex items-center gap-1.5 font-medium">
        <HugeiconsIcon icon={done ? CheckmarkCircle02Icon : AlertCircleIcon} strokeWidth={2} className="h-3.5 w-3.5 shrink-0" />
        {data.running
          ? `Indexing… ${data.exact ? `${data.count.toLocaleString()} left` : ""}`
          : done
            ? "Every memory is indexed for search by meaning."
            : data.exact
              ? `${data.count.toLocaleString()} ${data.count === 1 ? "memory isn't" : "memories aren't"} indexed for search by meaning.`
              : "Re-index every memory in the vector store."}
      </span>
      {!done && (
        <button
          type="button"
          onClick={start}
          disabled={starting || data.running}
          className="inline-flex h-7 items-center gap-1.5 rounded-full border border-current/30 px-3 text-[10px] font-bold hover:bg-background/40 disabled:opacity-50"
        >
          {(starting || data.running) && <Spinner />}
          Re-index
        </button>
      )}
    </div>
  );
}

