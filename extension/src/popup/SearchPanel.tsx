import React, { useEffect, useState } from "react";
import { ExternalLink, RefreshCw, Search } from "lucide-react";
import { apiFetch } from "../lib/api";
import { WEB_APP_URL } from "../lib/config";

interface Result {
  id: string;
  title: string;
  url: string | null;
  source: string | null;
  faviconUrl: string | null;
  description: string | null;
}

const open = (url: string) => chrome.tabs.create({ url });

/** Search the library from the popup, by what you remember about it, the same search as the app. */
export function SearchPanel() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const items = await apiFetch<Result[]>(`/memories?q=${encodeURIComponent(q)}&limit=8`);
        if (!cancelled) setResults(items);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Search didn't work.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <label style={s.field}>
        {loading ? <RefreshCw size={13} color="#8e8e93" className="animate-spin" /> : <Search size={13} color="#8e8e93" />}
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && query.trim()) void open(`${WEB_APP_URL}/app/search?q=${encodeURIComponent(query.trim())}`);
          }}
          placeholder="Search by what you remember…"
          aria-label="Search your library"
          style={s.input}
        />
      </label>

      {error && <span style={{ ...s.muted, color: "#ff3b30" }}>{error}</span>}

      {results === null ? (
        <span style={s.muted}>Try a topic, a site, or a few words you remember. Tip: type “sv” and a space in the address bar to search from there.</span>
      ) : results.length === 0 ? (
        <span style={s.muted}>Nothing matches “{query.trim()}”.</span>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {results.map((r) => (
            <div key={r.id} style={s.result}>
              <button style={s.resultMain} onClick={() => void open(r.url ?? `${WEB_APP_URL}/app/memories/${r.id}`)} title={r.url ?? "Open in Savedly"}>
                {r.faviconUrl ? <img src={r.faviconUrl} alt="" width={14} height={14} style={{ borderRadius: 3, flexShrink: 0 }} /> : <span style={s.dot} />}
                <span style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
                  <span style={s.title}>{r.title}</span>
                  <span style={s.muted}>{r.source ?? r.description ?? ""}</span>
                </span>
              </button>
              <button style={s.iconButton} title="Open in Savedly" aria-label={`Open ${r.title} in Savedly`} onClick={() => void open(`${WEB_APP_URL}/app/memories/${r.id}`)}>
                <ExternalLink size={12} color="#8e8e93" />
              </button>
            </div>
          ))}
        </div>
      )}

      {query.trim().length >= 2 && (
        <button style={s.footer} onClick={() => void open(`${WEB_APP_URL}/app/search?q=${encodeURIComponent(query.trim())}`)}>
          See all results in Savedly
        </button>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  field: { display: "flex", alignItems: "center", gap: 8, border: "1px solid #e5e5ea", borderRadius: 12, padding: "9px 12px", backgroundColor: "#f9f9f9" },
  input: { flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontSize: 12, color: "#1c1c1e" },
  muted: { fontSize: 11, color: "#8e8e93", lineHeight: "15px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  result: { display: "flex", alignItems: "center", gap: 4, borderRadius: 10 },
  resultMain: { flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, background: "transparent", border: "none", padding: "7px 6px", cursor: "pointer", textAlign: "left", borderRadius: 10 },
  title: { fontSize: 12, fontWeight: 600, color: "#1c1c1e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  dot: { width: 14, height: 14, borderRadius: 4, backgroundColor: "#e8eefc", flexShrink: 0 },
  iconButton: { background: "transparent", border: "none", padding: 6, cursor: "pointer", borderRadius: 8 },
  footer: { background: "transparent", border: "none", color: "#1447E6", fontSize: 11, fontWeight: 700, cursor: "pointer", padding: 4 },
};
