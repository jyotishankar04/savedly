"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { backupUrl, getUpdateStatus } from "@/lib/admin-system";

/**
 * Admin overview, self-hosted: download a backup of the whole install. The
 * browser saves the archive straight to disk, so it's a link, not a fetch.
 */
export function BackupCard({ filesInBucket, version }: { filesInBucket: boolean; version: string | null }) {
  const [includeKey, setIncludeKey] = useState(false);
  // Says nothing when the check is off or GitHub can't be reached.
  const { data: update } = useQuery({ queryKey: ["admin", "system", "update"], queryFn: getUpdateStatus, staleTime: 60 * 60 * 1000 });

  return (
    <section className="space-y-3 rounded-xl border border-border p-4">
      <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">Keep it safe</h3>
      <p className="text-xs leading-relaxed text-muted-foreground">
        A backup holds the database{filesInBucket ? "" : " and the uploaded files"}. Take one regularly, and before you upgrade.
        {filesInBucket && " Uploaded files are in your storage bucket and are not included; back those up there."}
      </p>

      <label className="flex items-start gap-2 text-xs text-foreground">
        <input
          type="checkbox"
          checked={includeKey}
          onChange={(event) => setIncludeKey(event.target.checked)}
          className="mt-0.5 size-3.5 rounded border-border accent-primary"
        />
        <span>
          Include the encryption key
          <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">
            {includeKey
              ? "The archive can then restore everything, including saved API keys. Anyone who has it can read them, so store it somewhere private."
              : "Without it, saved API keys and calendar connections can't be read after a restore and must be entered again."}
          </span>
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <a
          href={backupUrl(includeKey)}
          download
          className="inline-flex h-8 items-center rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Download backup
        </a>
        <Link href="/help/self-host#backup" className="text-xs text-primary hover:underline">
          How to restore
        </Link>
        <Link href="/help/self-host#upgrade" className="text-xs text-primary hover:underline">
          How to upgrade
        </Link>
      </div>

      {update?.updateAvailable ? (
        <div role="status" className="space-y-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5">
          <p className="text-xs font-semibold text-foreground">
            Version {update.latest} is available. You have {update.current}.
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Download a backup first, then run this in the install&apos;s folder:
          </p>
          <code className="block overflow-x-auto whitespace-nowrap rounded bg-muted px-2 py-1 font-mono text-[11px] text-foreground">
            git pull &amp;&amp; docker compose up -d --build
          </code>
          {update.url && (
            <a href={update.url} target="_blank" rel="noreferrer" className="inline-block text-[11px] text-primary hover:underline">
              What changed
            </a>
          )}
        </div>
      ) : (
        version && (
          <p className="font-mono text-[11px] text-muted-foreground">
            Version {version}
            {update?.latest && " · up to date"}
          </p>
        )
      )}
    </section>
  );
}
