import React from "react";
import { ExternalLink } from "lucide-react";
import { WEB_APP_URL } from "../lib/config";

export interface RowMemory {
  id: string;
  title: string;
  url: string | null;
  source: string | null;
  faviconUrl: string | null;
  description?: string | null;
  type?: string;
}

/** Opens where you'd expect: the current tab on a plain click, a new tab with ⌘/Ctrl or a middle click. */
export function openUrl(url: string, newTab: boolean): void {
  if (newTab) void chrome.tabs.create({ url, active: false });
  else void chrome.tabs.update({ url });
}

/**
 * One memory in a list (side panel, popup search). The page opens on click;
 * the arrow opens it in Savedly; the row can be dragged into a page as a link.
 * `actions` sit at the right on hover.
 */
export function MemoryRow({ memory, actions }: { memory: RowMemory; actions?: React.ReactNode }) {
  const target = memory.url ?? `${WEB_APP_URL}/app/memories/${memory.id}`;
  return (
    <div
      className="sv-row"
      style={s.row}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/uri-list", target);
        e.dataTransfer.setData("text/plain", target);
      }}
    >
      <button
        style={s.main}
        title={memory.url ?? "Open in Savedly"}
        onClick={(e) => openUrl(target, e.metaKey || e.ctrlKey)}
        onAuxClick={(e) => e.button === 1 && openUrl(target, true)}
      >
        {memory.faviconUrl ? <img src={memory.faviconUrl} alt="" width={16} height={16} style={{ borderRadius: 4, flexShrink: 0 }} /> : <span style={s.dot}>{(memory.type ?? "•").slice(0, 1).toUpperCase()}</span>}
        <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
          <span style={s.title}>{memory.title}</span>
          <span style={s.sub}>{memory.source ?? memory.description ?? ""}</span>
        </span>
      </button>
      <div className="sv-row-actions" style={s.actions}>
        {actions}
        <button style={s.icon} title="Open in Savedly" aria-label={`Open ${memory.title} in Savedly`} onClick={() => openUrl(`${WEB_APP_URL}/app/memories/${memory.id}`, true)}>
          <ExternalLink size={13} color="#8e8e93" />
        </button>
      </div>
    </div>
  );
}

export const rowStyles = {
  icon: { background: "transparent", border: "none", padding: 5, cursor: "pointer", borderRadius: 8, display: "grid", placeItems: "center" } as React.CSSProperties,
};

const s: Record<string, React.CSSProperties> = {
  row: { display: "flex", alignItems: "center", gap: 4, borderRadius: 10, paddingRight: 4 },
  main: { flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10, background: "transparent", border: "none", padding: "8px", cursor: "pointer", textAlign: "left" },
  title: { fontSize: 12.5, fontWeight: 600, color: "#1c1c1e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  sub: { fontSize: 11, color: "#8e8e93", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  dot: { width: 16, height: 16, borderRadius: 4, backgroundColor: "#e8eefc", color: "#1447E6", fontSize: 9, fontWeight: 700, display: "grid", placeItems: "center", flexShrink: 0 },
  actions: { display: "flex", alignItems: "center", gap: 2, opacity: 0.0, transition: "opacity .12s" },
  icon: rowStyles.icon,
};
