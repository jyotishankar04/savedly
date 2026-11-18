"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  REDDIT_CONNECTION_KEY,
  disconnectReddit,
  getRedditConnection,
  getRedditConnectUrl,
  syncRedditSaved,
  type RedditConnection,
} from "@/lib/reddit-integration";
import { timeAgo } from "@/lib/time";
import { ConnectLink } from "@/components/integrations/connect-link";

const PILL = "h-7 rounded-full px-3 text-[10px] font-bold";

/** What the card says under its title, for each state of the connection. */
export function redditSavedDescription(connection: RedditConnection | undefined): string {
  if (!connection?.connected) {
    return "Keep the posts and comments you save on Reddit, where you can actually find them again.";
  }
  const count = connection.importedCount;
  const added = `${count.toLocaleString()} ${count === 1 ? "item" : "items"} added`;
  if (!connection.lastSyncedAt) {
    return `Connected as u/${connection.username}. Bringing in your saved items now.`;
  }
  return `Connected as u/${connection.username}. ${added}. Checked ${timeAgo(connection.lastSyncedAt).toLowerCase()}.`;
}

/** The connection, refreshed while the initial import is running. */
export function useRedditConnection(enabled: boolean) {
  return useQuery({
    queryKey: REDDIT_CONNECTION_KEY,
    queryFn: getRedditConnection,
    enabled,
    refetchInterval: (query) => (query.state.data?.connected && !query.state.data.lastSyncedAt ? 2500 : false),
  });
}

/** Connect, Sync now and Disconnect actions for the Reddit card on the Integrations page. */
export function RedditSavedActions({ connection }: { connection: RedditConnection | undefined }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState<"sync" | "disconnect" | null>(null);

  // Back from Reddit's consent screen: show toast once, then clean the URL
  const result = params.get("reddit");
  useEffect(() => {
    if (!result) return;
    if (result === "connected") {
      toast.add({
        title: "Reddit connected",
        description: "Your saved posts and comments are being added.",
        type: "success",
      });
    } else {
      toast.add({
        title: "Reddit wasn't connected",
        description: "Nothing was changed. You can try again.",
        type: "error",
      });
    }
    queryClient.invalidateQueries({ queryKey: REDDIT_CONNECTION_KEY });
    router.replace("/app/integrations");
  }, [result, queryClient, router]);

  if (!connection?.connected) {
    return (
      <ConnectLink
        href={getRedditConnectUrl()}
        size="sm"
        variant="outline"
        className={`${PILL} hover:border-primary/40 hover:text-primary`}
      >
        Connect
      </ConnectLink>
    );
  }

  const sync = async () => {
    setBusy("sync");
    try {
      const { added, leftOver } = await syncRedditSaved();
      toast.add({
        title: added === 0 ? "No new saved items" : `${added} ${added === 1 ? "item" : "items"} added`,
        description: leftOver > 0 ? `${leftOver} didn't fit in your library.` : undefined,
        type: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["memories"] });
    } catch (err) {
      toast.add({
        title: "Couldn't sync",
        description: err instanceof Error ? err.message : undefined,
        type: "error",
      });
    } finally {
      await queryClient.invalidateQueries({ queryKey: REDDIT_CONNECTION_KEY });
      setBusy(null);
    }
  };

  const disconnect = async () => {
    setBusy("disconnect");
    try {
      await disconnectReddit();
      toast.add({
        title: "Reddit disconnected",
        description: "The items already in your library stay there.",
        type: "success",
      });
    } catch (err) {
      toast.add({
        title: "Couldn't disconnect",
        description: err instanceof Error ? err.message : undefined,
        type: "error",
      });
    } finally {
      await queryClient.invalidateQueries({ queryKey: REDDIT_CONNECTION_KEY });
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
          <ConnectLink href={getRedditConnectUrl()} size="sm" className={PILL}>
            Connect again
          </ConnectLink>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className={`${PILL} hover:border-primary/40 hover:text-primary`}
            onClick={sync}
            disabled={busy !== null || !connection.lastSyncedAt}
          >
            {busy === "sync" || !connection.lastSyncedAt ? "Syncing…" : "Sync now"}
          </Button>
        )}
        <button
          type="button"
          onClick={disconnect}
          disabled={busy !== null}
          className="text-[10px] font-semibold text-muted-foreground hover:text-destructive disabled:opacity-50"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}
