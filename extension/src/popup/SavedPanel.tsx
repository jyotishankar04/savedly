import React, { useEffect, useState } from "react";
import { AlarmClock, Check, Highlighter, Inbox, RefreshCw, Sparkles, X } from "lucide-react";
import { apiFetch } from "../lib/api";
import { formatRemindAt, remindChoices } from "../lib/remind";

interface MemoryState {
  id: string;
  title: string;
  status: string;
  description: string | null;
  tags: string[];
  collections: { id: string; name: string }[];
  readAt?: string | null;
  remindAt?: string | null;
  highlights?: { id: string; text: string; color: string; note: string | null }[];
}

const HIGHLIGHT_COLORS: Record<string, string> = { yellow: "#fde68a", green: "#bbf7d0", blue: "#bfdbfe", pink: "#fbcfe8", purple: "#ddd6fe" };

// How long the popup keeps checking for the AI's result while it's open.
const POLL_MS = 2500;
const POLL_TRIES = 24;

/**
 * What happens next with a saved page: what Savedly understood (once the AI
 * has read it), whether it's in the Inbox, and Remind me. Shown right after
 * saving, and when the popup opens on a page that's already saved.
 */
export function SavedPanel({ memoryId, tabId }: { memoryId: string; /** The tab showing the page, to scroll to a highlight on it. */ tabId?: number }) {
  const [memory, setMemory] = useState<MemoryState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [choices] = useState(() => remindChoices());

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const load = async () => {
      try {
        const next = await apiFetch<MemoryState>(`/memories/${memoryId}`);
        if (cancelled) return;
        setMemory(next);
        // Still being read: look again shortly, for a while.
        if (next.status === "processing" && ++tries < POLL_TRIES) timer = setTimeout(load, POLL_MS);
      } catch {
        if (!cancelled) setError("Couldn't load what Savedly understood.");
      }
    };
    void load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [memoryId]);

  const patch = async (key: string, body: Record<string, unknown>) => {
    setBusy(key);
    setError(null);
    try {
      setMemory(await apiFetch<MemoryState>(`/memories/${memoryId}`, { method: "PATCH", body: JSON.stringify(body) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work.");
    } finally {
      setBusy(null);
    }
  };

  if (!memory) {
    return (
      <div style={s.card}>
        <span style={s.muted}>{error ?? "Loading…"}</span>
      </div>
    );
  }

  const reading = memory.status === "processing";
  const unread = !memory.readAt;
  const remindAt = memory.remindAt && new Date(memory.remindAt).getTime() > Date.now() ? memory.remindAt : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={s.card}>
        <div style={s.cardHead}>
          <Sparkles size={13} color="#1447E6" />
          <span style={s.cardTitle}>What Savedly understood</span>
        </div>
        {reading ? (
          <span style={s.muted}>
            <RefreshCw size={11} className="animate-spin" style={{ marginRight: 6, verticalAlign: -1 }} />
            Reading it now…
          </span>
        ) : (
          <>
            <span style={s.strong}>{memory.title}</span>
            {memory.description && <span style={s.summary}>{memory.description}</span>}
            {memory.tags.length > 0 && (
              <div style={s.chips}>
                {memory.tags.slice(0, 5).map((tag) => (
                  <span key={tag} style={s.tag}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            {memory.collections.length > 0 && <span style={s.muted}>In {memory.collections.map((c) => c.name).join(", ")}</span>}
          </>
        )}
      </div>

      <div style={s.row}>
        <Inbox size={13} color={unread ? "#1447E6" : "#8e8e93"} />
        <span style={{ ...s.rowText, color: unread ? "#1c1c1e" : "#8e8e93" }}>{unread ? "In your Inbox to read later" : "Marked as read"}</span>
        <button style={s.textButton} disabled={busy !== null} onClick={() => void patch("read", { isRead: unread })}>
          {unread ? "Mark as read" : "Read later"}
        </button>
      </div>

      <div style={{ ...s.row, alignItems: "flex-start", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
          <AlarmClock size={13} color={remindAt ? "#1447E6" : "#8e8e93"} />
          <span style={s.rowText}>{remindAt ? `Comes back ${formatRemindAt(remindAt)}` : "Remind me"}</span>
          {remindAt && (
            <button style={s.textButton} disabled={busy !== null} onClick={() => void patch("cancel", { remindAt: null })}>
              <X size={11} style={{ verticalAlign: -1 }} /> Cancel
            </button>
          )}
        </div>
        {!remindAt && (
          <div style={s.chips}>
            {choices.map((choice) => (
              <button key={choice.id} style={s.chip} disabled={busy !== null} onClick={() => void patch(choice.id, { remindAt: choice.at.toISOString() })}>
                {busy === choice.id ? <RefreshCw size={10} className="animate-spin" /> : null}
                {choice.label}
              </button>
            ))}
          </div>
        )}
        {remindAt && (
          <span style={{ ...s.muted, display: "flex", alignItems: "center", gap: 4 }}>
            <Check size={11} color="#1447E6" /> It leaves your Inbox until then, and you'll get a notification.
          </span>
        )}
      </div>

      {memory.highlights && memory.highlights.length > 0 && (
        <div style={{ ...s.card, backgroundColor: "#ffffff" }}>
          <div style={s.cardHead}>
            <Highlighter size={13} color="#1447E6" />
            <span style={s.cardTitle}>Highlights ({memory.highlights.length})</span>
          </div>
          {memory.highlights.map((h) => (
            <button
              key={h.id}
              style={s.highlight}
              title={tabId != null ? "Show it on the page" : undefined}
              onClick={() => tabId != null && chrome.tabs.sendMessage(tabId, { action: "SCROLL_TO_HIGHLIGHT", id: h.id }, () => void chrome.runtime.lastError)}
            >
              <span style={{ ...s.highlightBar, backgroundColor: HIGHLIGHT_COLORS[h.color] ?? HIGHLIGHT_COLORS.yellow }} />
              <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={s.highlightText}>{h.text}</span>
                {h.note && <span style={s.muted}>{h.note}</span>}
              </span>
            </button>
          ))}
        </div>
      )}

      {error && <span style={{ ...s.muted, color: "#ff3b30" }}>{error}</span>}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  card: { border: "1px solid #e5e5ea", borderRadius: 12, padding: 12, backgroundColor: "#f9f9f9", display: "flex", flexDirection: "column", gap: 6 },
  cardHead: { display: "flex", alignItems: "center", gap: 6 },
  cardTitle: { fontSize: 11, fontWeight: 700, color: "#1c1c1e" },
  strong: { fontSize: 12, fontWeight: 700, color: "#1c1c1e", lineHeight: "16px" },
  summary: {
    fontSize: 11,
    color: "#3a3a3c",
    lineHeight: "15px",
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  muted: { fontSize: 11, color: "#8e8e93", lineHeight: "15px" },
  chips: { display: "flex", flexWrap: "wrap", gap: 6 },
  tag: { fontSize: 10, color: "#3a3a3c", backgroundColor: "#ffffff", border: "1px solid #e5e5ea", borderRadius: 999, padding: "2px 8px" },
  row: { display: "flex", alignItems: "center", gap: 8, border: "1px solid #e5e5ea", borderRadius: 12, padding: "9px 12px" },
  rowText: { flex: 1, fontSize: 12, fontWeight: 600, color: "#1c1c1e" },
  textButton: { background: "transparent", border: "none", color: "#1447E6", fontSize: 11, fontWeight: 700, cursor: "pointer", padding: 0, whiteSpace: "nowrap" },
  highlight: { display: "flex", gap: 8, alignItems: "stretch", background: "transparent", border: "none", padding: "4px 0", cursor: "pointer", textAlign: "left" },
  highlightBar: { width: 3, borderRadius: 2, flexShrink: 0 },
  highlightText: { fontSize: 11, color: "#1c1c1e", lineHeight: "15px", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    fontWeight: 600,
    color: "#1c1c1e",
    backgroundColor: "#ffffff",
    border: "1px solid #e5e5ea",
    borderRadius: 999,
    padding: "5px 10px",
    cursor: "pointer",
  },
};
