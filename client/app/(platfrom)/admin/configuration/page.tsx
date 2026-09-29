"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listFlags, updateFlag } from "@/lib/feature-flags";
import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  updateAnnouncement,
  type Announcement,
  type AnnouncementType,
  type AnnouncementDisplayMode,
} from "@/lib/announcements";
import { toast } from "@/components/ui/toast";
import { getServerConfig } from "@/lib/server-config";
import { getSystemStatus } from "@/lib/admin-system";

const RESERVED_KEYS = {
  GOOGLE: "auth.google.enabled",
  GITHUB: "auth.github.enabled",
  PASSWORD: "auth.password.enabled",
  SIGNUPS: "signups.enabled",
  MAINTENANCE: "maintenance.enabled",
  MAINTENANCE_MESSAGE: "maintenance.message",
};

export default function AdminConfigurationPage() {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState<string | null>(null);

  const { data: flags, isLoading, isError } = useQuery({
    queryKey: ["admin", "flags"],
    queryFn: listFlags,
  });

  // A self-hosted install always allows password sign-in, and only offers
  // Google/GitHub once they're set up in Infrastructure — so those toggles
  // either do nothing or aren't there yet.
  const { data: config } = useQuery({ queryKey: ["server-config"], queryFn: getServerConfig });
  const selfHosted = !!config?.selfHosted;
  const { data: system } = useQuery({ queryKey: ["admin", "system"], queryFn: getSystemStatus, enabled: selfHosted });
  const showGoogle = !selfHosted || !!system?.services.googleSignIn;
  const showGithub = !selfHosted || !!system?.services.githubSignIn;

  const flagByKey = new Map((flags ?? []).map((f) => [f.key, f]));
  // features.* flags have their own page (Features).
  const otherFlags = (flags ?? []).filter(
    (f) => !Object.values(RESERVED_KEYS).includes(f.key) && !f.key.startsWith("features."),
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "flags"] });

  const toggle = async (key: string, next: boolean) => {
    setPending(key);
    try {
      await updateFlag(key, next);
      invalidate();
      toast.add({ title: `${key} ${next ? "enabled" : "disabled"}.`, type: "success" });
    } catch {
      toast.add({ title: "Failed to update flag.", type: "error" });
    } finally {
      setPending(null);
    }
  };

  const saveMaintenanceMessage = async () => {
    if (messageDraft === null) return;
    setPending(RESERVED_KEYS.MAINTENANCE_MESSAGE);
    try {
      await updateFlag(RESERVED_KEYS.MAINTENANCE_MESSAGE, messageDraft);
      invalidate();
      toast.add({ title: "Maintenance message updated.", type: "success" });
      setMessageDraft(null);
    } catch {
      toast.add({ title: "Failed to update message.", type: "error" });
    } finally {
      setPending(null);
    }
  };

  if (isLoading) return <p className="text-xs text-muted-foreground">Loading...</p>;
  if (isError) return <p className="text-xs text-destructive">Failed to load configuration.</p>;

  const google = flagByKey.get(RESERVED_KEYS.GOOGLE);
  const github = flagByKey.get(RESERVED_KEYS.GITHUB);
  const password = flagByKey.get(RESERVED_KEYS.PASSWORD);
  const signups = flagByKey.get(RESERVED_KEYS.SIGNUPS);
  const maintenance = flagByKey.get(RESERVED_KEYS.MAINTENANCE);
  const maintenanceMessage = flagByKey.get(RESERVED_KEYS.MAINTENANCE_MESSAGE);

  return (
    <div className="space-y-8 max-w-xl">
      <h1 className="text-lg font-bold text-foreground">Configuration</h1>

      {/* Auth toggles */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">Authentication</h3>

        {showGoogle && (
          <ToggleRow
            label="Google sign-in"
            description="Allow signing in and signing up with Google."
            checked={Boolean(google?.value)}
            disabled={pending === RESERVED_KEYS.GOOGLE}
            onChange={(v) => toggle(RESERVED_KEYS.GOOGLE, v)}
          />
        )}
        {showGithub && (
          <ToggleRow
            label="GitHub sign-in"
            description="Allow signing in and signing up with GitHub."
            checked={Boolean(github?.value)}
            disabled={pending === RESERVED_KEYS.GITHUB}
            onChange={(v) => toggle(RESERVED_KEYS.GITHUB, v)}
          />
        )}
        {!selfHosted && (
          <ToggleRow
            label="Email and password sign-in"
            description="Allow accounts with an email and password."
            checked={Boolean(password?.value)}
            disabled={pending === RESERVED_KEYS.PASSWORD}
            onChange={(v) => toggle(RESERVED_KEYS.PASSWORD, v)}
          />
        )}
        <ToggleRow
          label="New signups"
          description={
            selfHosted
              ? "Let anyone who can open this install create an account. Turn it off and add people from Users instead."
              : "Allow brand-new accounts to be created. Existing users can still sign in."
          }
          checked={Boolean(signups?.value)}
          disabled={pending === RESERVED_KEYS.SIGNUPS}
          onChange={(v) => toggle(RESERVED_KEYS.SIGNUPS, v)}
        />
        {selfHosted && (!showGoogle || !showGithub) && (
          <p className="text-[11px] text-muted-foreground">
            To let people sign in with Google or GitHub, set it up in{" "}
            <Link href="/admin/infrastructure" className="text-primary hover:underline">
              Infrastructure
            </Link>
            .
          </p>
        )}
      </section>

      {/* Maintenance mode */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">Maintenance mode</h3>

        <ToggleRow
          label="Enable maintenance mode"
          description="Blocks all non-admin traffic app-wide until turned off."
          checked={Boolean(maintenance?.value)}
          disabled={pending === RESERVED_KEYS.MAINTENANCE}
          onChange={(v) => toggle(RESERVED_KEYS.MAINTENANCE, v)}
          warn
        />

        <div className="space-y-2">
          <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Message shown to visitors
          </label>
          <Textarea
            value={messageDraft ?? (typeof maintenanceMessage?.value === "string" ? maintenanceMessage.value : "")}
            onChange={(e) => setMessageDraft(e.target.value)}
            rows={2}
            className="text-xs"
          />
          <button
            type="button"
            onClick={saveMaintenanceMessage}
            disabled={messageDraft === null || pending === RESERVED_KEYS.MAINTENANCE_MESSAGE}
            className="h-7 rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-3.5 hover:bg-primary/90 transition-colors disabled:opacity-40"
          >
            Save message
          </button>
        </div>
      </section>

      {/* Other flags */}
      {otherFlags.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">Other flags</h3>
          {otherFlags.map((flag) => (
            <ToggleRow
              key={flag.key}
              label={flag.key}
              description={flag.description ?? ""}
              checked={Boolean(flag.value)}
              disabled={pending === flag.key}
              onChange={(v) => toggle(flag.key, v)}
            />
          ))}
        </section>
      )}

      <AnnouncementsSection selfHosted={selfHosted} emailOn={!selfHosted || !!system?.services.email} />
    </div>
  );
}

const ANNOUNCEMENT_TYPE_LABEL: Record<AnnouncementType, string> = {
  countdown: "Countdown",
  announcement: "Announcement",
  update: "Update",
};

/**
 * Self-hosted drops launch countdowns (a hosted-marketing tool) and the
 * email-everyone option until email is set up.
 */
function AnnouncementsSection({ selfHosted, emailOn }: { selfHosted: boolean; emailOn: boolean }) {
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [type, setType] = useState<AnnouncementType>("announcement");
  const [displayMode, setDisplayMode] = useState<AnnouncementDisplayMode>("banner");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [notifyByEmail, setNotifyByEmail] = useState(false);

  const { data: announcements, isLoading, isError } = useQuery({
    queryKey: ["admin", "announcements"],
    queryFn: listAnnouncements,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "announcements"] });

  const resetForm = () => {
    setType("announcement");
    setDisplayMode("banner");
    setTitle("");
    setMessage("");
    setTargetDate("");
    setNotifyByEmail(false);
  };

  const handleCreate = async () => {
    if (!title.trim() || !message.trim()) return;
    setCreating(true);
    try {
      await createAnnouncement({
        type,
        displayMode,
        title: title.trim(),
        message: message.trim(),
        targetDate: type === "countdown" && targetDate ? new Date(targetDate).toISOString() : undefined,
        notifyByEmail,
      });
      invalidate();
      resetForm();
      toast.add({
        title: "Announcement created.",
        description: notifyByEmail ? "Emailing all active users now." : undefined,
        type: "success",
      });
    } catch {
      toast.add({ title: "Failed to create announcement.", type: "error" });
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (announcement: Announcement) => {
    setPendingId(announcement.id);
    try {
      await updateAnnouncement(announcement.id, { isActive: !announcement.isActive });
      invalidate();
      toast.add({ title: announcement.isActive ? "Deactivated." : "Activated — now the one live announcement.", type: "success" });
    } catch {
      toast.add({ title: "Failed to update announcement.", type: "error" });
    } finally {
      setPendingId(null);
    }
  };

  const toggleDisplayMode = async (announcement: Announcement) => {
    const next = announcement.displayMode === "full_page" ? "banner" : "full_page";
    setPendingId(announcement.id);
    try {
      await updateAnnouncement(announcement.id, { displayMode: next });
      invalidate();
      toast.add({
        title: next === "full_page" ? "Now a full page takeover." : "Now a sticky banner.",
        type: "success",
      });
    } catch {
      toast.add({ title: "Failed to update announcement.", type: "error" });
    } finally {
      setPendingId(null);
    }
  };

  const remove = async (id: string) => {
    setPendingId(id);
    try {
      await deleteAnnouncement(id);
      invalidate();
      toast.add({ title: "Announcement deleted.", type: "success" });
    } catch {
      toast.add({ title: "Failed to delete announcement.", type: "error" });
    } finally {
      setPendingId(null);
    }
  };

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">
          {selfHosted ? "Announcements" : "Announcements & launch countdowns"}
        </h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {selfHosted ? (
            "A message everyone sees, like a planned upgrade. Only one can be live at a time; activating one turns the others off."
          ) : (
            <>
              Only one can be active at a time — activating one deactivates any other. Served publicly at{" "}
              <code className="font-mono">GET /announcements/active</code>.
            </>
          )}
        </p>
      </div>

      {isLoading && <p className="text-xs text-muted-foreground">Loading...</p>}
      {isError && <p className="text-xs text-destructive">Failed to load announcements.</p>}

      {announcements && announcements.length > 0 && (
        <div className="space-y-2">
          {announcements.map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-4 p-3 border border-border rounded-xl">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{ANNOUNCEMENT_TYPE_LABEL[a.type]}</Badge>
                  {a.displayMode === "full_page" && <Badge variant="destructive">Full page</Badge>}
                  {a.isActive && <Badge>Live</Badge>}
                  <span className="text-xs font-semibold text-foreground truncate">{a.title}</span>
                </div>
                <p className="text-[10px] text-muted-foreground line-clamp-2">{a.message}</p>
                {a.targetDate && (
                  <p className="text-[10px] text-muted-foreground font-mono">Target: {new Date(a.targetDate).toLocaleString()}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={pendingId === a.id}
                  onClick={() => toggleDisplayMode(a)}
                  title="Blocks every page except /admin while active, instead of showing as a sticky banner."
                  className="h-7 rounded-full border border-border text-[10px] font-bold px-3 hover:bg-muted transition-colors disabled:opacity-40"
                >
                  {a.displayMode === "full_page" ? "Make banner" : "Make full page"}
                </button>
                <button
                  type="button"
                  disabled={pendingId === a.id}
                  onClick={() => toggleActive(a)}
                  className="h-7 rounded-full border border-border text-[10px] font-bold px-3 hover:bg-muted transition-colors disabled:opacity-40"
                >
                  {a.isActive ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  disabled={pendingId === a.id}
                  onClick={() => remove(a.id)}
                  className="h-7 rounded-full border border-destructive/30 text-destructive text-[10px] font-bold px-3 hover:bg-destructive/10 transition-colors disabled:opacity-40"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="p-3 border border-dashed border-border rounded-xl space-y-2.5">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">New announcement</span>

        <div className="flex gap-2">
          <Select items={{ countdown: "Countdown", announcement: "Announcement", update: "Update" }} value={type} onValueChange={(v) => v && setType(v as AnnouncementType)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {!selfHosted && <SelectItem value="countdown">Countdown</SelectItem>}
              <SelectItem value="announcement">Announcement</SelectItem>
              <SelectItem value="update">Update</SelectItem>
            </SelectContent>
          </Select>
          {type === "countdown" && (
            <Input type="datetime-local" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="flex-1" />
          )}
        </div>

        <label className="flex items-center gap-2.5 py-1">
          <Switch
            checked={displayMode === "full_page"}
            onCheckedChange={(checked) => setDisplayMode(checked ? "full_page" : "banner")}
          />
          <span className="text-xs text-foreground">
            Full page takeover
            <span className="block text-[10px] text-muted-foreground font-normal">
              Blocks every page (marketing, app, auth) except /admin — like maintenance mode. Otherwise shows as a sticky banner.
            </span>
          </span>
        </label>

        <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea placeholder="Message shown to visitors" value={message} onChange={(e) => setMessage(e.target.value)} rows={2} className="text-xs" />

        {emailOn && (
          <label className="flex items-center gap-2.5 cursor-pointer">
            <Switch checked={notifyByEmail} onCheckedChange={setNotifyByEmail} />
            <span className="text-xs text-foreground">
              Also email all active users
              <span className="block text-[10px] text-muted-foreground font-normal">
                Sends the title and message above as an email to everyone, queued through /admin/emails. Only applies to this creation — editing later never re-sends.
              </span>
            </span>
          </label>
        )}

        <button
          type="button"
          onClick={handleCreate}
          disabled={creating || !title.trim() || !message.trim()}
          className="h-7 rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-3.5 hover:bg-primary/90 transition-colors disabled:opacity-40"
        >
          Create
        </button>
      </div>
    </section>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
  warn,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
  warn?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-3 border border-border rounded-xl">
      <div>
        <span className={warn && checked ? "text-xs font-semibold text-destructive" : "text-xs font-semibold text-foreground"}>
          {label}
        </span>
        <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}
