"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckIcon as Check,
  LoaderCircleIcon as Loader2,
  Add01Icon as Plus,
  Delete02Icon as Trash,
  PencilEdit02Icon as Pencil,
  CheckmarkCircle01Icon as CheckCircle,
  Alert01Icon as AlertIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { useSettingsGroup } from "@/hooks/use-settings-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/toast";
import { ApiError } from "@/lib/auth";
import {
  assignRole,
  createCredential,
  deleteCredential,
  EMBEDDINGS_INCOMPATIBLE_PROVIDERS,
  getPlatformDefaults,
  listCredentials,
  listRoleAssignments,
  PROVIDER_LABEL,
  formatModelPrice,
  listCredentialModels,
  modelFitsRole,
  ROLE_DESCRIPTION,
  ROLE_LABEL,
  unassignRole,
  updateCredential,
  type AiCredential,
  type AiProvider,
  type AiRole,
  type AiRoleAssignment,
  AI_STATUS_QUERY_KEY,
  getAiStatus,
  type AiAllowance,
  type AiStatus,
} from "@/lib/ai-settings";

const PROVIDERS: AiProvider[] = ["openrouter", "openai", "anthropic", "groq", "google", "custom"];
const MAX_MODEL_SUGGESTIONS = 8;
const ROLES: AiRole[] = ["fast", "reasoning", "vision", "embeddings"];

/** Own-key mode: one line on the plan's small included-AI allowance, if it has one. */
function IncludedAiNote({ status }: { status: AiStatus | undefined }) {
  const own = "Keys you add here are used only for your account and are never shared.";
  const included = status?.included;
  if (!included || !status?.includedReady) {
    return <p className="text-[10px] text-muted-foreground leading-relaxed">Bring your own API key from any provider. {own}</p>;
  }
  return (
    <p className="text-[10px] text-muted-foreground leading-relaxed">
      Your plan includes some AI we supply: AI processing for {left(included.saves)} saves and {left(included.questions)} Ask
      questions left this month. Add your
      own key below and it&apos;s used instead, with no limits. {own}
    </p>
  );
}

const left = (a: AiAllowance) => (a.limit === null ? "unlimited" : Math.max(0, a.limit - a.used).toLocaleString("en-US"));

/** Managed mode (AI included): nothing to configure — show what the plan supplies and how much is left. */
function ManagedAiPanel({ status }: { status: AiStatus }) {
  const rows = status.included
    ? [
        { label: "AI processing (saves)", a: status.included.saves },
        { label: "Ask questions", a: status.included.questions },
      ]
    : [];
  return (
    <section className="space-y-3">
      <div className="p-5 border border-border bg-card rounded-xl space-y-4">
        <div>
          <h4 className="text-foreground text-xs font-bold">AI is included in your plan</h4>
          <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed font-medium">
            We choose fast, capable models and run them for you: reading and filing what you save, answering your questions, and reading
            images. There&apos;s nothing to set up.
          </p>
        </div>

        {!status.includedReady && (
          <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-[10px] font-medium text-amber-700 dark:text-amber-400">
            AI isn&apos;t available on this server yet. It starts working as soon as it&apos;s set up; nothing is needed from you.
          </p>
        )}

        <div className="space-y-3">
          {rows.map(({ label, a }) => {
            const pct = a.limit === null || a.limit === 0 ? 0 : Math.min(100, Math.round((a.used / a.limit) * 100));
            return (
              <div key={label} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-[10px]">
                  <span className="text-foreground">{label} this month</span>
                  <span className="text-muted-foreground font-mono tabular-nums">
                    {a.limit === null ? "Unlimited" : `${a.used.toLocaleString("en-US")} / ${a.limit.toLocaleString("en-US")}`}
                  </span>
                </div>
                {a.limit !== null && a.limit > 0 && (
                  <div className="h-1 rounded-full bg-muted overflow-hidden" aria-hidden>
                    <div
                      className={cn("h-full rounded-full", pct >= 90 ? "bg-destructive" : pct >= 75 ? "bg-amber-500" : "bg-primary")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
          Allowances reset at the start of each month.{" "}
          <Link href="/app/settings/billing" className="text-primary hover:underline">
            See your plan
          </Link>
          .
        </p>
      </div>

      {status.savedKeysIgnored > 0 && (
        <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
          You have {status.savedKeysIgnored} saved API {status.savedKeysIgnored === 1 ? "key" : "keys"} from before. {status.savedKeysIgnored === 1 ? "It's" : "They're"} kept
          but not used while AI is included in your plan, and {status.savedKeysIgnored === 1 ? "is" : "are"} used again if you move to a plan
          where you bring your own key.
        </p>
      )}
    </section>
  );
}

export default function AISettingsPage() {
  const { data: status, isLoading } = useQuery({ queryKey: AI_STATUS_QUERY_KEY, queryFn: getAiStatus });
  const managed = status?.mode === "managed";

  return (
    <div className="space-y-10 max-w-2xl text-xs font-semibold">
      <div className="space-y-1 pb-4 border-b border-border/25">
        <h3 className="text-sm font-bold text-foreground">AI</h3>
        {managed ? (
          <p className="text-[10px] text-muted-foreground leading-relaxed">Your plan includes AI, so there are no keys or models to manage.</p>
        ) : (
          <>
            <IncludedAiNote status={status} />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Not sure which models to use?{" "}
              <Link href="/help/model-selection" className="text-primary hover:underline">
                Compare models and prices
              </Link>
              .
            </p>
          </>
        )}
      </div>

      {isLoading ? null : managed && status ? (
        <ManagedAiPanel status={status} />
      ) : (
        <>
          <ProviderKeysSection />
          <ModelRolesSection />
        </>
      )}
      <AiFeatureToggles managed={managed} />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Provider keys — add/edit happen as inline forms on the page, not popups.
// -----------------------------------------------------------------------------

function ProviderKeysSection() {
  const queryClient = useQueryClient();
  const { data: credentials, isLoading } = useQuery({ queryKey: ["ai-settings", "credentials"], queryFn: listCredentials });
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<AiCredential | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCredential(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
      toast.add({ title: "Provider key removed.", type: "success" });
      setDeleting(null);
    },
    onError: () => toast.add({ title: "Couldn't remove that key.", type: "error" }),
  });

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-foreground text-xs font-bold">Provider keys</h4>
        {!addOpen && (
          <Button
            size="sm"
            className="h-7 rounded-full text-[10px] gap-1 px-3"
            onClick={() => {
              setEditingId(null);
              setAddOpen(true);
            }}
          >
            <HugeiconsIcon icon={Plus} strokeWidth={2.25} className="h-3 w-3" />
            Add key
          </Button>
        )}
      </div>

      {isLoading && <HugeiconsIcon icon={Loader2} strokeWidth={2.25} className="h-4 w-4 animate-spin text-muted-foreground" />}

      {!isLoading && (credentials?.length ?? 0) === 0 && !addOpen && (
        <div className="p-4 border border-dashed border-border/60 rounded-xl text-center text-[10px] text-muted-foreground">
          No provider keys yet. Add one from OpenAI, Anthropic, Groq, Google, or any OpenAI-compatible endpoint.
        </div>
      )}

      {(credentials?.length ?? 0) > 0 && (
        <div className="space-y-2">
          {credentials!.map((credential) =>
            editingId === credential.id ? (
              <CredentialForm
                key={credential.id}
                editing={credential}
                onDone={() => setEditingId(null)}
              />
            ) : (
              <div
                key={credential.id}
                className="flex items-center justify-between gap-3 p-3 border border-border bg-card rounded-xl"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground truncate">{credential.label}</span>
                    <Badge variant="secondary" className="text-[9px]">{PROVIDER_LABEL[credential.provider]}</Badge>
                  </div>
                  {credential.baseUrl && <p className="text-[9.5px] text-muted-foreground mt-0.5 truncate">{credential.baseUrl}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      setAddOpen(false);
                      setEditingId(credential.id);
                    }}
                  >
                    <HugeiconsIcon icon={Pencil} strokeWidth={2.25} className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(credential)}>
                    <HugeiconsIcon icon={Trash} strokeWidth={2.25} className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {addOpen && <CredentialForm editing={null} onDone={() => setAddOpen(false)} />}

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia tone="warning">
              <HugeiconsIcon icon={Trash} strokeWidth={2} />
            </AlertDialogMedia>
            <AlertDialogTitle>Remove &quot;{deleting?.label}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Any role currently using this key (Fast/Reasoning/Vision/Embeddings) will become unconfigured until you assign a different key.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
            >
              {deleteMutation.isPending ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

/** Inline form — used both for "Add key" (editing=null, appended below the list) and "Edit" (editing=credential, replaces that row in place). */
function CredentialForm({ editing, onDone }: { editing: AiCredential | null; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState<AiProvider>(editing?.provider ?? "openai");
  const [label, setLabel] = useState(editing?.label ?? "");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(editing?.baseUrl ?? "");

  const mutation = useMutation({
    mutationFn: () =>
      editing
        ? updateCredential(editing.id, { label, apiKey: apiKey || undefined, baseUrl: provider === "custom" ? baseUrl : undefined })
        : createCredential({ provider, label, apiKey, baseUrl: provider === "custom" ? baseUrl : undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
      toast.add({ title: editing ? "Key updated." : "Key added.", type: "success" });
      onDone();
    },
    onError: (err) => {
      toast.add({ title: err instanceof ApiError ? err.message : "Couldn't save that key.", type: "error" });
    },
  });

  const canSubmit = label.trim().length > 0 && (editing || apiKey.trim().length > 0) && (provider !== "custom" || baseUrl.trim().length > 0);

  return (
    <div className="p-4 border border-primary/30 bg-card rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-foreground font-bold">{editing ? "Edit provider key" : "Add provider key"}</span>
        <span className="text-[9px] text-muted-foreground font-normal">Encrypted at rest — used only for your account</span>
      </div>

      {!editing && (
        <div className="space-y-1.5">
          <Label>Provider</Label>
          <Select value={provider} onValueChange={(v) => v && setProvider(v as AiProvider)}>
            <SelectTrigger className="w-full">
              <SelectValue>{(value: AiProvider) => PROVIDER_LABEL[value]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((p) => (
                <SelectItem key={p} value={p}>
                  {PROVIDER_LABEL[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Label</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. My OpenAI key" />
        </div>
        <div className="space-y-1.5">
          <Label>API key {editing && <span className="text-muted-foreground font-normal">(leave blank to keep current)</span>}</Label>
          <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={editing ? "••••••••" : "sk-..."} />
        </div>
      </div>

      {provider === "custom" && (
        <div className="space-y-1.5">
          <Label>Base URL</Label>
          <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://openrouter.ai/api/v1" />
          <p className="text-[9.5px] text-muted-foreground">Any OpenAI-compatible endpoint — OpenRouter, Together, Fireworks, a local Ollama/LM Studio instance, etc.</p>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button size="sm" disabled={!canSubmit || mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Model roles — one inline form per task, always visible, no popup.
// -----------------------------------------------------------------------------

function ModelRolesSection() {
  const { data: credentials } = useQuery({ queryKey: ["ai-settings", "credentials"], queryFn: listCredentials });
  const { data: assignments, isLoading: rolesLoading } = useQuery({ queryKey: ["ai-settings", "roles"], queryFn: listRoleAssignments });
  const { data: platformDefaults } = useQuery({ queryKey: ["ai-settings", "platform-defaults"], queryFn: getPlatformDefaults });

  const assignmentByRole = new Map((assignments ?? []).map((a) => [a.role, a]));

  return (
    <section className="space-y-3">
      <div>
        <h4 className="text-foreground text-xs font-bold">Model roles</h4>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Once you&apos;ve added a key above, choose which key and model handles each task. Unconfigured roles are simply skipped — nothing breaks, that enrichment just doesn&apos;t run yet.
        </p>
      </div>

      <div className="space-y-3">
        {ROLES.map((role) => (
          <RoleForm
            key={role}
            role={role}
            credentials={credentials ?? []}
            current={assignmentByRole.get(role)}
            rolesLoading={rolesLoading}
            usesPlatformDefault={!assignmentByRole.get(role) && Boolean(platformDefaults?.[role])}
          />
        ))}
      </div>
    </section>
  );
}

function RoleForm({
  role,
  credentials,
  current,
  rolesLoading,
  usesPlatformDefault,
}: {
  role: AiRole;
  credentials: AiCredential[];
  current: AiRoleAssignment | undefined;
  rolesLoading: boolean;
  usesPlatformDefault: boolean;
}) {
  const queryClient = useQueryClient();
  const eligibleCredentials =
    role === "embeddings" ? credentials.filter((c) => !EMBEDDINGS_INCOMPATIBLE_PROVIDERS.includes(c.provider)) : credentials;

  const [credentialId, setCredentialId] = useState("");
  const [model, setModel] = useState("");
  // Seeds the form from the saved assignment exactly once, as soon as it's
  // loaded — a plain useEffect on `current` would also fire (and clobber
  // in-progress edits) on every background refetch, e.g. the 15s poll
  // elsewhere in this app's query defaults.
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current || rolesLoading) return;
    initializedRef.current = true;
    setCredentialId(current?.credentialId ?? "");
    setModel(current?.model ?? "");
  }, [rolesLoading, current]);

  const selectedCredential = eligibleCredentials.find((c) => c.id === credentialId);
  // Live list of every model this key can use (asked of its provider, priced
  // from OpenRouter's catalog). Typing in the model box filters it.
  const { data: modelList, isLoading: modelsLoading } = useQuery({
    queryKey: ["ai-settings", "credential-models", credentialId],
    queryFn: () => listCredentialModels(credentialId),
    enabled: Boolean(selectedCredential),
    staleTime: 5 * 60 * 1000,
  });
  const roleModels = (modelList?.models ?? []).filter((m) => modelFitsRole(m, role));
  const search = model.trim().toLowerCase();
  const suggestions = roleModels
    .filter((m) => !search || m.id.toLowerCase().includes(search) || m.name.toLowerCase().includes(search))
    .filter((m) => m.id !== model)
    .sort((a, b) => (a.inputPrice ?? Infinity) - (b.inputPrice ?? Infinity))
    .slice(0, MAX_MODEL_SUGGESTIONS);
  const isDirty = credentialId !== (current?.credentialId ?? "") || model !== (current?.model ?? "");

  const assignMutation = useMutation({
    mutationFn: () => assignRole(role, { credentialId, model }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
      toast.add({ title: `${ROLE_LABEL[role]} configured and verified.`, type: "success" });
    },
    onError: (err) => {
      toast.add({ title: err instanceof ApiError ? err.message : "That didn't work — check the key and model name.", type: "error" });
    },
  });

  const unassignMutation = useMutation({
    mutationFn: () => unassignRole(role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
      setCredentialId("");
      setModel("");
      toast.add({ title: `${ROLE_LABEL[role]} unconfigured.`, type: "success" });
    },
  });

  return (
    <div className="p-4 border border-border bg-card rounded-xl space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-foreground font-bold">{ROLE_LABEL[role]}</span>
          <p className="text-[9.5px] text-muted-foreground mt-0.5 leading-relaxed max-w-md">{ROLE_DESCRIPTION[role]}</p>
        </div>
        {current ? (
          <span className="flex items-center gap-1 text-[9px] text-emerald-600 shrink-0">
            <HugeiconsIcon icon={CheckCircle} strokeWidth={2.25} className="h-3 w-3" />
            Configured
          </span>
        ) : usesPlatformDefault ? (
          <span className="flex items-center gap-1 text-[9px] text-primary shrink-0">
            <HugeiconsIcon icon={CheckCircle} strokeWidth={2.25} className="h-3 w-3" />
            Provided by default
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[9px] text-muted-foreground shrink-0">
            <HugeiconsIcon icon={AlertIcon} strokeWidth={2.25} className="h-3 w-3" />
            Not set
          </span>
        )}
      </div>

      {usesPlatformDefault && (
        <p className="text-[9.5px] text-muted-foreground bg-primary/5 border border-primary/15 rounded-lg p-2">
          Covered by us at no cost to you — add your own key below to use a different model instead.
        </p>
      )}

      {role === "embeddings" && (
        <p className="text-[10px] text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 leading-relaxed">
          The model you pick must output exactly 1536-dimensional vectors (e.g. OpenAI&apos;s text-embedding-3-small). It&apos;s tested live when you save — a mismatched model is rejected with the actual dimension count.
        </p>
      )}

      {eligibleCredentials.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">
          {role === "embeddings"
            ? "None of your saved keys support embeddings (Groq and Anthropic don't offer an embeddings API). Add an OpenRouter, OpenAI, Google, or custom key above."
            : "Add a provider key above, then come back here to assign it to this role."}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Key</Label>
              <Select value={credentialId} onValueChange={(v) => v && setCredentialId(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string) => {
                      const selected = eligibleCredentials.find((c) => c.id === value);
                      return selected ? `${selected.label} · ${PROVIDER_LABEL[selected.provider]}` : "Select a key";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {eligibleCredentials.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label} · {PROVIDER_LABEL[c.provider]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Model</Label>
              <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Search or type a model ID" />
            </div>
          </div>

          {selectedCredential && (
            <div className="space-y-1.5">
              {modelsLoading ? (
                <p className="text-[9.5px] text-muted-foreground">Loading this key&apos;s models…</p>
              ) : modelList?.error ? (
                <p className="text-[9.5px] text-muted-foreground">{modelList.error}</p>
              ) : (
                <>
                  <p className="text-[9.5px] text-muted-foreground">
                    {roleModels.length} {roleModels.length === 1 ? "model fits" : "models fit"} this role · {search ? "matching your search" : "cheapest first"} · prices per 1M tokens
                  </p>
                  {suggestions.length > 0 && (
                    <div className="border border-border/60 rounded-lg divide-y divide-border/50 overflow-hidden">
                      {suggestions.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setModel(m.id)}
                          className="w-full flex items-center justify-between gap-3 px-2.5 py-1.5 text-left hover:bg-muted/60 transition-colors"
                        >
                          <span className="min-w-0 flex items-center gap-1.5">
                            <span className="font-mono text-[9.5px] text-foreground truncate">{m.id}</span>
                            {m.vision && role !== "vision" && <Badge variant="outline" className="h-4 px-1 text-[8px]">vision</Badge>}
                          </span>
                          <span className="text-[9px] text-muted-foreground tabular-nums shrink-0">{formatModelPrice(m)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-1">
            {current ? (
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={unassignMutation.isPending} onClick={() => unassignMutation.mutate()}>
                Unassign
              </Button>
            ) : (
              <span />
            )}
            <Button
              size="sm"
              disabled={!credentialId || !model.trim() || !isDirty || assignMutation.isPending}
              onClick={() => assignMutation.mutate()}
            >
              {assignMutation.isPending ? "Verifying…" : "Save"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Feature toggles (unrelated to provider config — which AI capabilities are
// switched on at all)
// -----------------------------------------------------------------------------

function AiFeatureToggles({ managed = false }: { managed?: boolean }) {
  const { value: ai, loading, error, set } = useSettingsGroup("ai");

  return (
    <section className="space-y-3">
      <div>
        <h4 className="text-foreground text-xs font-bold">Features</h4>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {managed
            ? "Which AI-powered capabilities are switched on."
            : "Which AI-powered capabilities are switched on (still requires the relevant role above to be configured)."}
        </p>
      </div>

      {loading && <HugeiconsIcon icon={Loader2} strokeWidth={2.25} className="h-4 w-4 animate-spin text-muted-foreground" />}
      {error && <p className="text-[10px] text-destructive">{error}</p>}

      {ai && (
        <div className="space-y-2">
          {(
            [
              { key: "autoOrganization", title: "Automatic organization", desc: "Sort incoming cards into appropriate folder collections." },
              { key: "summaries", title: "AI summaries", desc: "Write quick summaries detailing content scope." },
              { key: "relatedMemories", title: "Related memories mapping", desc: "Display connected similarity nodes." },
              { key: "semanticSearch", title: "Semantic search capabilities", desc: "Query libraries using descriptive tags." },
              { key: "askSaveForLatter", title: "Ask SaveForLatter assistant chatbot", desc: "Enable conceptual conversation queries." },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              onClick={() => set(item.key, !ai[item.key])}
              className="w-full text-left p-3.5 border border-border bg-card rounded-xl hover:border-primary/20 transition-all flex items-start justify-between gap-4"
            >
              <div>
                <h4 className="text-foreground">{item.title}</h4>
                <p className="text-[9.5px] text-muted-foreground mt-0.5 leading-relaxed font-medium">{item.desc}</p>
              </div>

              <div
                className={cn(
                  "h-5 w-5 rounded border flex items-center justify-center shrink-0 transition-all",
                  ai[item.key] ? "bg-primary border-primary text-white" : "border-border bg-background"
                )}
              >
                {ai[item.key] && <HugeiconsIcon icon={Check} strokeWidth={2.25} className="h-3.5 w-3.5 stroke-[2.5]" />}
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
