import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlarmClock, AlertCircle, ArrowLeft, Check, Clock, Folder, Inbox, RefreshCw, Search as SearchIcon, ExternalLink } from "lucide-react";
import { apiFetch, ApiError } from "../lib/api";
import { WEB_APP_URL } from "../lib/config";
import { remindChoices } from "../lib/remind";
import { SavedPanel } from "../popup/SavedPanel";
import { SearchPanel } from "../popup/SearchPanel";
import { MemoryRow, rowStyles, type RowMemory } from "../ui/MemoryRow";

type Tab = "inbox" | "search" | "recent" | "collections";
interface Page {
  tabId: number;
  url: string;
  title: string;
}
interface SavedPage {
  id: string;
  title: string;
}
interface CollectionItem {
  id: string;
  name: string;
  icon: string;
  memoryCount: number;
}

const isWebPage = (url?: string) => !!url && /^https?:\/\//.test(url);
const domain = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/**
 * Savedly beside the page: the current tab (save it, or what Savedly has on
 * it, highlights included), then the Inbox, search, recent saves and
 * collections. It follows the tab you're on.
 */
export default function SidePanel() {
  const [auth, setAuth] = useState<"checking" | "in" | "out" | "problem">("checking");
  const [problem, setProblem] = useState<string | null>(null);
  const [page, setPage] = useState<Page | null>(null);
  const [tab, setTab] = useState<Tab>("inbox");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    chrome.runtime.sendMessage({ action: "SYNC_AUTH" }, (response?: { signedIn?: boolean; problem?: string | null }) => {
      void chrome.runtime.lastError;
      if (response?.signedIn) setAuth("in");
      else if (response?.problem) {
        setProblem(response.problem);
        setAuth("problem");
      } else setAuth("out");
    });
  }, []);

  // The page in the current tab, from what the content script told the background.
  // The tab the panel follows, so a page it reports after the panel opened (still loading then) is picked up.
  const followedTab = useRef<number | null>(null);
  // The panel belongs to one window; tab changes in other windows aren't its business.
  const ownWindow = useRef<number | null>(null);
  const loadPage = useCallback(async (tabId?: number) => {
    const id = tabId ?? (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;
    followedTab.current = id ?? null;
    if (id == null) return setPage(null);
    chrome.runtime.sendMessage({ action: "GET_TAB_PAGE", tabId: id }, (found?: { url: string; title: string } | null) => {
      void chrome.runtime.lastError;
      setPage(found ? { tabId: id, ...found } : null);
    });
  }, []);

  useEffect(() => {
    void loadPage();
    chrome.windows.getCurrent((win) => {
      ownWindow.current = win?.id ?? null;
    });
    const mine = (windowId?: number) => windowId == null || ownWindow.current == null || windowId === ownWindow.current;
    const onMessage = (request: { action?: string; tabId?: number; windowId?: number; url?: string | null; title?: string | null }) => {
      if (request.action === "ACTIVE_TAB" && mine(request.windowId)) void loadPage(request.tabId);
      if (request.action === "TAB_PAGE" && request.tabId === followedTab.current) {
        // No address: the tab moved to a page the extension can't see (a new tab, chrome://).
        setPage(request.url ? { tabId: request.tabId, url: request.url, title: request.title ?? "" } : null);
      }
    };
    chrome.runtime.onMessage.addListener(onMessage);
    // Back from another window: things may have changed in the app.
    const onFocus = () => setRefreshKey((k) => k + 1);
    window.addEventListener("focus", onFocus);
    return () => {
      chrome.runtime.onMessage.removeListener(onMessage);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadPage]);

  const open = (path: string) => chrome.tabs.create({ url: `${WEB_APP_URL}${path}` });

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <img src={chrome.runtime.getURL("icon-48.png")} alt="" width={22} height={22} />
          <span style={s.logo}>
            saved<span style={{ fontWeight: 500, color: "#1447E6" }}>ly</span>
          </span>
        </div>
        <button style={rowStyles.icon} title="Open Savedly" aria-label="Open Savedly" onClick={() => open("/app")}>
          <ExternalLink size={14} color="#8e8e93" />
        </button>
      </div>

      {auth === "checking" && <p style={s.muted}>Connecting to Savedly…</p>}
      {auth === "out" && (
        <div style={s.center}>
          <p style={s.strong}>Sign in to Savedly</p>
          <p style={s.muted}>Sign in on the website; the side panel uses the same sign-in.</p>
          <button style={s.primary} onClick={() => open("/auth/login")}>
            Sign in
          </button>
        </div>
      )}
      {auth === "problem" && (
        <div style={s.center}>
          <AlertCircle size={24} color="#ff3b30" />
          <p style={s.strong}>Can't reach Savedly</p>
          <p style={s.muted}>{problem}</p>
          <button style={s.secondary} onClick={() => location.reload()}>
            Try again
          </button>
        </div>
      )}

      {auth === "in" && (
        <>
          <CurrentPage page={page} refreshKey={refreshKey} />
          <div style={s.tabs} role="tablist">
            {(
              [
                ["inbox", "Inbox", Inbox],
                ["search", "Search", SearchIcon],
                ["recent", "Recent", Clock],
                ["collections", "Collections", Folder],
              ] as const
            ).map(([id, label, Icon]) => (
              <button key={id} role="tab" aria-selected={tab === id} style={tab === id ? s.tabActive : s.tab} onClick={() => setTab(id)}>
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
          {tab === "inbox" && <InboxList refreshKey={refreshKey} />}
          {tab === "search" && <SearchPanel />}
          {tab === "recent" && <MemoryList path="/memories?limit=30" empty="Nothing saved yet." refreshKey={refreshKey} />}
          {tab === "collections" && <Collections refreshKey={refreshKey} />}
        </>
      )}
    </div>
  );
}

/** The current tab: save it, or (when it's saved) what Savedly understood, the Inbox, Remind me and highlights. */
function CurrentPage({ page, refreshKey }: { page: Page | null; refreshKey: number }) {
  const [saved, setSaved] = useState<SavedPage | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSaved(undefined);
    setError(null);
    if (!page || !isWebPage(page.url)) return;
    let cancelled = false;
    apiFetch<SavedPage | null>(`/memories/lookup?url=${encodeURIComponent(page.url)}`)
      .then((found) => !cancelled && setSaved(found))
      .catch(() => !cancelled && setSaved(null));
    return () => {
      cancelled = true;
    };
  }, [page?.url, page?.tabId, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!page || !isWebPage(page.url)) {
    return <div style={s.card}><span style={s.muted}>Open a web page to save it here.</span></div>;
  }

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const memory = await apiFetch<{ id: string; title: string }>("/memories", {
        method: "POST",
        body: JSON.stringify({ type: "web", url: page.url, title: (page.title || "Untitled Webpage").slice(0, 500), captureMethod: "extension" }),
      });
      setSaved(memory);
      chrome.runtime.sendMessage({ action: "PAGE_SAVED", url: page.url, tabId: page.tabId }, () => void chrome.runtime.lastError);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save this page.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
      <div style={s.card}>
        <span style={s.overline}>This page</span>
        <span style={s.strong}>{page.title || domain(page.url)}</span>
        <span style={s.muted}>{domain(page.url)}</span>
        {saved === null && (
          <button style={{ ...s.primary, marginTop: 6 }} disabled={saving} onClick={save}>
            {saving ? "Saving…" : "Save this page"}
          </button>
        )}
        {saved && (
          <span style={{ ...s.muted, display: "flex", alignItems: "center", gap: 4, color: "#1447E6" }}>
            <Check size={12} /> Saved to Savedly
          </span>
        )}
        {error && <span style={{ ...s.muted, color: "#ff3b30" }}>{error}</span>}
      </div>
      {saved && <SavedPanel key={`${saved.id}:${refreshKey}`} memoryId={saved.id} tabId={page.tabId} />}
    </div>
  );
}

function useList<T>(path: string, refreshKey: number) {
  const [items, setItems] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let cancelled = false;
    apiFetch<T[]>(path)
      .then((data) => !cancelled && setItems(data))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Couldn't load this."));
    return () => {
      cancelled = true;
    };
  }, [path, refreshKey, reload]);
  return { items, error, reload: () => setReload((n) => n + 1), setItems };
}

function MemoryList({ path, empty, refreshKey }: { path: string; empty: string; refreshKey: number }) {
  const { items, error } = useList<RowMemory>(path, refreshKey);
  if (error) return <p style={{ ...s.muted, color: "#ff3b30" }}>{error}</p>;
  if (!items) return <Loading />;
  if (items.length === 0) return <p style={s.muted}>{empty}</p>;
  return (
    <div style={s.list}>
      {items.map((m) => (
        <MemoryRow key={m.id} memory={m} />
      ))}
    </div>
  );
}

/** Unread saves: mark one read, or bring it back tomorrow. */
function InboxList({ refreshKey }: { refreshKey: number }) {
  const { items, error, setItems } = useList<RowMemory>("/memories?inbox=true&limit=50", refreshKey);
  const [tomorrow] = useState(() => remindChoices().find((c) => c.id === "tomorrow")!.at);
  const act = async (id: string, body: Record<string, unknown>) => {
    setItems((list) => list?.filter((m) => m.id !== id) ?? null);
    await apiFetch(`/memories/${id}`, { method: "PATCH", body: JSON.stringify(body) }).catch(() => undefined);
  };
  if (error) return <p style={{ ...s.muted, color: "#ff3b30" }}>{error}</p>;
  if (!items) return <Loading />;
  if (items.length === 0) return <p style={s.muted}>You're all caught up. New links, videos and documents you save land here.</p>;
  return (
    <div style={s.list}>
      {items.map((m) => (
        <MemoryRow
          key={m.id}
          memory={m}
          actions={
            <>
              <button style={rowStyles.icon} title="Mark as read" aria-label={`Mark ${m.title} as read`} onClick={() => void act(m.id, { isRead: true })}>
                <Check size={13} color="#8e8e93" />
              </button>
              <button style={rowStyles.icon} title="Remind me tomorrow" aria-label={`Remind me about ${m.title} tomorrow`} onClick={() => void act(m.id, { remindAt: tomorrow.toISOString() })}>
                <AlarmClock size={13} color="#8e8e93" />
              </button>
            </>
          }
        />
      ))}
    </div>
  );
}

function Collections({ refreshKey }: { refreshKey: number }) {
  const { items, error } = useList<CollectionItem>("/collections", refreshKey);
  const [opened, setOpened] = useState<CollectionItem | null>(null);
  if (opened) {
    return (
      <div>
        <button style={s.back} onClick={() => setOpened(null)}>
          <ArrowLeft size={13} /> Collections
        </button>
        <p style={{ ...s.strong, margin: "6px 4px 8px" }}>
          {opened.icon} {opened.name}
        </p>
        <MemoryList path={`/memories?collectionId=${opened.id}&limit=50`} empty="Nothing in this collection yet." refreshKey={refreshKey} />
      </div>
    );
  }
  if (error) return <p style={{ ...s.muted, color: "#ff3b30" }}>{error}</p>;
  if (!items) return <Loading />;
  if (items.length === 0) return <p style={s.muted}>No collections yet.</p>;
  return (
    <div style={s.list}>
      {[...items]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => (
          <button key={c.id} className="sv-row" style={s.collection} onClick={() => setOpened(c)}>
            <span style={{ width: 18, textAlign: "center" }}>{/^\p{Extended_Pictographic}/u.test(c.icon) ? c.icon : "📁"}</span>
            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
            <span style={s.count}>{c.memoryCount}</span>
          </button>
        ))}
    </div>
  );
}

function Loading() {
  return (
    <p style={{ ...s.muted, display: "flex", alignItems: "center", gap: 6 }}>
      <RefreshCw size={12} className="animate-spin" /> Loading…
    </p>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { padding: 14, boxSizing: "border-box", minHeight: "100vh" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  logo: { fontSize: 15, fontWeight: 700, letterSpacing: "-0.5px" },
  center: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center", padding: "40px 12px" },
  card: { border: "1px solid #e5e5ea", borderRadius: 12, padding: 12, backgroundColor: "#f9f9f9", display: "flex", flexDirection: "column", gap: 3 },
  overline: { fontSize: 10, fontWeight: 700, color: "#8e8e93", textTransform: "uppercase", letterSpacing: ".04em" },
  strong: { fontSize: 13, fontWeight: 700, color: "#1c1c1e", lineHeight: "17px", margin: 0 },
  muted: { fontSize: 11.5, color: "#8e8e93", lineHeight: "16px", margin: 0 },
  primary: { backgroundColor: "#1447E6", color: "#fff", border: "none", borderRadius: 10, padding: "9px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  secondary: { backgroundColor: "#fff", color: "#1c1c1e", border: "1px solid #e5e5ea", borderRadius: 10, padding: "9px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  tabs: { display: "flex", gap: 4, padding: 3, borderRadius: 12, backgroundColor: "#f2f2f5", marginBottom: 10 },
  tab: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, border: "none", background: "transparent", borderRadius: 9, padding: "7px 4px", fontSize: 11.5, fontWeight: 600, color: "#6b6b70", cursor: "pointer" },
  tabActive: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, border: "none", background: "#fff", borderRadius: 9, padding: "7px 4px", fontSize: 11.5, fontWeight: 700, color: "#1c1c1e", cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,.08)" },
  list: { display: "flex", flexDirection: "column", gap: 1 },
  collection: { display: "flex", alignItems: "center", gap: 10, border: "none", background: "transparent", borderRadius: 10, padding: "9px 8px", fontSize: 12.5, fontWeight: 600, color: "#1c1c1e", cursor: "pointer", textAlign: "left" },
  count: { fontSize: 11, color: "#8e8e93" },
  back: { display: "flex", alignItems: "center", gap: 4, border: "none", background: "transparent", color: "#1447E6", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 4 },
};
