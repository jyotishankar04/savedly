"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, ArrowUp01Icon, CheckmarkCircle02Icon, CircleIcon } from "@hugeicons/core-free-icons";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { SectionCard } from "@/components/admin/instance-section-form";
import { useUser } from "@/context/UserContext";
import { getSetupStatus, setSetupSkipped, type SetupItemId, type SetupStatus } from "@/lib/admin-system";
import { getInstanceSettings } from "@/lib/instance-settings";
import { SELF_HOSTED } from "@/lib/instance";
import { getServerConfig } from "@/lib/server-config";
import { cn } from "@/lib/utils";

// First-time setup for a self-hosted install, shown at the top of the
// dashboard until the admin has dealt with every step. AI has to be set up;
// the rest already work with a default, which the admin can keep.

const ITEMS: Record<SetupItemId, { title: string; todo: string; kept: string; skipLabel: string; sections: string[]; dialog: string }> = {
  ai: {
    title: "AI",
    todo: "Summaries, tags, search by meaning and Ask need an AI key.",
    kept: "",
    skipLabel: "",
    sections: ["includedAi", "embeddings"],
    dialog: "Add the AI key this install uses for everyone. An OpenAI key covers search by meaning too; with another provider, fill in Embeddings as well.",
  },
  storage: {
    title: "File storage",
    todo: "Files are kept on this server's disk. Connect S3-compatible storage, such as R2, to keep them elsewhere.",
    kept: "Files stay on this server's disk.",
    skipLabel: "Keep on this server",
    sections: ["storage"],
    dialog: "Set Storage to S3-compatible, then fill in the bucket details. Files already uploaded are not moved.",
  },
  email: {
    title: "Email",
    todo: "Without it, sharing invitations and notices aren't sent.",
    kept: "No emails are sent.",
    skipLabel: "Skip email",
    sections: ["email"],
    dialog: "Any SMTP provider works. Turn it on, fill in the details, and test before saving.",
  },
  signIn: {
    title: "Google or GitHub sign-in",
    todo: "People sign in with an email and password. Add Google or GitHub as well if you want.",
    kept: "Email and password only.",
    skipLabel: "Passwords only",
    sections: ["googleAuth", "githubAuth"],
    dialog: "Set up either one, or both. Each needs an OAuth app created with the callback URL shown.",
  },
};

const SETUP_KEY = ["admin", "system", "setup"];
const COLLAPSED_KEY = "sfl:setup-collapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function SetupPanel() {
  const { user } = useUser();
  const isAdmin = user.roles.includes("admin");
  const queryClient = useQueryClient();
  const { data: status } = useQuery({ queryKey: SETUP_KEY, queryFn: getSetupStatus, enabled: SELF_HOSTED && isAdmin });
  const { data: config } = useQuery({ queryKey: ["server-config"], queryFn: getServerConfig, enabled: SELF_HOSTED && !isAdmin });
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [open, setOpen] = useState<SetupItemId | null>(null);
  const [busy, setBusy] = useState<SetupItemId | null>(null);

  if (!SELF_HOSTED) return null;

  // Someone who can't change the install still deserves to know why AI is quiet.
  if (!isAdmin) {
    if (!config || config.aiReady) return null;
    return (
      <p role="note" className="mx-4 mt-4 rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground md:mx-6">
        AI features aren&apos;t set up yet. Ask the person who runs this install.
      </p>
    );
  }

  if (!status || status.complete) return null;

  const settled = status.items.filter((item) => item.done || item.skipped).length;
  const progress = `${settled} of ${status.items.length} done`;

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
    } catch {
      // Private mode: it just won't be remembered.
    }
  };

  const skip = async (id: SetupItemId, skipped: boolean) => {
    setBusy(id);
    try {
      queryClient.setQueryData<SetupStatus>(SETUP_KEY, await setSetupSkipped(id, skipped));
    } catch (err) {
      toast.add({ title: "Couldn't save that", description: err instanceof Error ? err.message : undefined, type: "error" });
    } finally {
      setBusy(null);
    }
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: SETUP_KEY });
    queryClient.invalidateQueries({ queryKey: ["admin", "system"] });
    queryClient.invalidateQueries({ queryKey: ["server-config"] });
  };

  return (
    <section aria-labelledby="setup-title" className="mx-4 mt-4 overflow-hidden rounded-2xl border border-primary/25 bg-card md:mx-6">
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-expanded={!collapsed}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
      >
        <span>
          <span id="setup-title" className="block text-sm font-semibold text-foreground">
            Finish setting up Savedly
          </span>
          <span className="block text-xs text-muted-foreground">{progress}</span>
        </span>
        <HugeiconsIcon icon={collapsed ? ArrowDown01Icon : ArrowUp01Icon} strokeWidth={2} className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {!collapsed && (
        <ul className="divide-y divide-border border-t border-border">
          {status.items.map((item) => {
            const copy = ITEMS[item.id];
            return (
              <li key={item.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <HugeiconsIcon
                  icon={item.done || item.skipped ? CheckmarkCircle02Icon : CircleIcon}
                  strokeWidth={2}
                  className={cn("h-4 w-4 shrink-0", item.done ? "text-emerald-600 dark:text-emerald-400" : item.skipped ? "text-muted-foreground" : "text-primary")}
                />
                <div className="min-w-0 flex-1 basis-48">
                  <p className="text-xs font-semibold text-foreground">
                    {copy.title}
                    {item.required && !item.done && <span className="ml-2 font-medium text-primary">Required</span>}
                  </p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">{item.done ? "Set up." : item.skipped ? copy.kept : copy.todo}</p>
                </div>
                <div className="flex items-center gap-2">
                  {busy === item.id && <Spinner />}
                  {item.skipped && !item.done && (
                    <button type="button" onClick={() => skip(item.id, false)} disabled={busy !== null} className="h-7 rounded-full px-3 text-[11px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-40">
                      Undo
                    </button>
                  )}
                  {!item.required && !item.done && !item.skipped && (
                    <button type="button" onClick={() => skip(item.id, true)} disabled={busy !== null} className="h-7 rounded-full border border-border px-3 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-40">
                      {copy.skipLabel}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpen(item.id)}
                    className={cn(
                      "h-7 rounded-full px-3.5 text-[11px] font-semibold transition-colors",
                      item.done || item.skipped ? "border border-border text-foreground hover:bg-muted" : "bg-primary text-primary-foreground hover:bg-primary/90",
                    )}
                  >
                    {item.done ? "Change" : "Set up"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <SetupDialog item={open} onClose={() => setOpen(null)} onSaved={refresh} />
    </section>
  );
}

function SetupDialog({ item, onClose, onSaved }: { item: SetupItemId | null; onClose: () => void; onSaved: () => void }) {
  const { data, isLoading } = useQuery({ queryKey: ["admin", "instance-settings"], queryFn: getInstanceSettings, enabled: item !== null });
  const copy = item ? ITEMS[item] : null;
  const sections = copy && data ? copy.sections.flatMap((id) => data.sections.filter((section) => section.id === id)) : [];

  return (
    <Dialog open={item !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{copy?.title}</DialogTitle>
          <DialogDescription>{copy?.dialog}</DialogDescription>
        </DialogHeader>
        {isLoading || !data ? (
          <div className="flex justify-center py-10 text-muted-foreground">
            <Spinner />
          </div>
        ) : (
          <div className="space-y-6">
            {sections.map((section) => (
              <SectionCard
                key={section.id}
                section={section}
                editable={section.editable}
                callbackUrl={section.id === "googleAuth" ? data.callbackUrls.google : section.id === "githubAuth" ? data.callbackUrls.github : undefined}
                onSaved={onSaved}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
