import React, { useEffect, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { MemoryRow } from "../ui/MemoryRow";
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
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {results.map((r) => (
            <MemoryRow key={r.id} memory={r} />
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
  footer: { background: "transparent", border: "none", color: "#1447E6", fontSize: 11, fontWeight: 700, cursor: "pointer", padding: 4 },
};
