"use client";

import { useState } from "react";
import Link from "next/link";
import { backupUrl } from "@/lib/admin-system";

/**
 * Admin overview, self-hosted: download a backup of the whole install. The
 * browser saves the archive straight to disk, so it's a link, not a fetch.
 */
export function BackupCard({ filesInBucket, version }: { filesInBucket: boolean; version: string | null }) {
  const [includeKey, setIncludeKey] = useState(false);

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

      {version && <p className="font-mono text-[11px] text-muted-foreground">Version {version}</p>}
    </section>
  );
}
