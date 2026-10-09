"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  GITHUB_CONNECTION_KEY,
  disconnectGithub,
  getGithubConnection,
  getGithubConnectUrl,
  syncGithubStars,
  type GithubConnection,
} from "@/lib/github-integration";
import { timeAgo } from "@/lib/time";

const PILL = "h-7 rounded-full px-3 text-[10px] font-bold";

/** What the card says under its title, for each state of the connection. */
export function githubStarsDescription(connection: GithubConnection | undefined): string {
  if (!connection?.connected) return "Add the repositories you star on GitHub to your library, with a summary of what each one does.";
  const count = connection.importedCount;
  const added = `${count.toLocaleString()} ${count === 1 ? "repository" : "repositories"} added`;
  if (!connection.lastSyncedAt) return `Connected as @${connection.login}. Bringing in your stars now.`;
  return `Connected as @${connection.login}. ${added}. Checked ${timeAgo(connection.lastSyncedAt).toLowerCase()}.`;
}

/** The connection, refreshed often while the first import is still arriving. */
export function useGithubConnection(enabled: boolean) {
  return useQuery({
    queryKey: GITHUB_CONNECTION_KEY,
    queryFn: getGithubConnection,
    enabled,
    refetchInterval: (query) => (query.state.data?.connected && !query.state.data.lastSyncedAt ? 2500 : false),
  });
}

/** Connect, Sync now and Disconnect for the GitHub stars card on the Integrations page. */
export function GithubStarsActions({ connection }: { connection: GithubConnection | undefined }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState<"sync" | "disconnect" | null>(null);

  // Back from GitHub's consent screen: say how it went, once, then tidy the address.
  const result = params.get("github");
  useEffect(() => {
    if (!result) return;
    if (result === "connected") toast.add({ title: "GitHub connected", description: "Your starred repositories are being added.", type: "success" });
    else toast.add({ title: "GitHub wasn't connected", description: "Nothing was changed. You can try again.", type: "error" });
    queryClient.invalidateQueries({ queryKey: GITHUB_CONNECTION_KEY });
    router.replace("/app/integrations");
  }, [result, queryClient, router]);

  if (!connection?.connected) {
    return (
      <Button size="sm" variant="outline" className={`${PILL} hover:border-primary/40 hover:text-primary`} render={<a href={getGithubConnectUrl()} />} nativeButton={false}>
        Connect
      </Button>
    );
  }

  const sync = async () => {
    setBusy("sync");
    try {
      const { added, leftOver } = await syncGithubStars();
      toast.add({
        title: added === 0 ? "No new stars" : `${added} ${added === 1 ? "repository" : "repositories"} added`,
        description: leftOver > 0 ? `${leftOver} didn't fit in your library.` : undefined,
        type: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["memories"] });
    } catch (err) {
      toast.add({ title: "Couldn't sync", description: err instanceof Error ? err.message : undefined, type: "error" });
    } finally {
      await queryClient.invalidateQueries({ queryKey: GITHUB_CONNECTION_KEY });
      setBusy(null);
    }
  };

  const disconnect = async () => {
    setBusy("disconnect");
    try {
      await disconnectGithub();
      toast.add({ title: "GitHub disconnected", description: "The repositories already in your library stay there.", type: "success" });
    } catch (err) {
      toast.add({ title: "Couldn't disconnect", description: err instanceof Error ? err.message : undefined, type: "error" });
    } finally {
      await queryClient.invalidateQueries({ queryKey: GITHUB_CONNECTION_KEY });
      setBusy(null);
    }
  };

  return (
    <div className="space-y-2">
      {connection.lastError && (
        <p role="status" className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
          {connection.lastError}
        </p>
      )}
      <div className="flex items-center gap-2">
        {connection.needsReconnect ? (
          <Button size="sm" className={PILL} render={<a href={getGithubConnectUrl()} />} nativeButton={false}>
            Connect again
          </Button>
        ) : (
          <Button size="sm" variant="outline" className={`${PILL} hover:border-primary/40 hover:text-primary`} onClick={sync} disabled={busy !== null || !connection.lastSyncedAt}>
            {busy === "sync" || !connection.lastSyncedAt ? "Syncing…" : "Sync now"}
          </Button>
        )}
        <button type="button" onClick={disconnect} disabled={busy !== null} className="text-[10px] font-semibold text-muted-foreground hover:text-destructive disabled:opacity-50">
          Disconnect
        </button>
      </div>
    </div>
  );
}
