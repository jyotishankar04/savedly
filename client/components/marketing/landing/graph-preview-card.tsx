"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { MEMORY_TYPE_COLORS } from "@/lib/memory-type-colors";
import { EDGE_KIND_LABEL, type GraphEdge, type GraphNode, type GraphEdgeKind } from "@/lib/memory-graph";
import type { MemoryType } from "@/types/memory";

// Extracted out of graph-section.tsx so the same live canvas + demo data
// can sit inside a compact visual slot elsewhere on the site (the
// alternating features section) without a second, drifting copy of either.
//
// Reuses the real in-app graph renderer (components/memory-graph/), not a
// lookalike — same react-force-graph-2d + d3-force stack the product
// already ships, same MEMORY_TYPE_COLORS, same click-to-highlight
// behaviour. Canvas + force simulation can't run server-side, hence the
// dynamic import (matches app/(platfrom)/app/graph/page.tsx's own).
const MemoryGraphCanvas = dynamic(
  () => import("@/components/memory-graph/memory-graph-canvas").then((mod) => mod.MemoryGraphCanvas),
  { ssr: false, loading: () => null },
);

export const NODE_LEGEND: MemoryType[] = ["web", "video", "note", "image", "document", "voice"];
export const EDGE_LEGEND: GraphEdgeKind[] = ["semantic", "tag", "collection"];

// A fixed demo graph, not live data — same reasoning as every other scripted
// section: a landing page shouldn't need a signed-in session or a real API
// call. Nodes continue the running "saved things" set from the How It
// Works / Ask / Search sections (the NAS research, the desk setup) so a
// reader who scrolled through all of them sees the same library, not a
// disconnected demo each time.
export const DEMO_NODES: GraphNode[] = [
  { id: "n1", title: "Synology vs. self-built TrueNAS: a real cost breakdown", type: "web", resourceCategory: null, previewImageUrl: null, tags: ["nas"], collections: [{ id: "c1", name: "Home Lab" }], createdAt: "" },
  { id: "n2", title: "Building a 6-bay ZFS NAS from scratch", type: "video", resourceCategory: null, previewImageUrl: null, tags: ["nas"], collections: [{ id: "c1", name: "Home Lab" }], createdAt: "" },
  { id: "n3", title: "home lab — drive shortlist", type: "note", resourceCategory: null, previewImageUrl: null, tags: ["nas"], collections: [{ id: "c1", name: "Home Lab" }], createdAt: "" },
  { id: "n4", title: "Podcast episode — home networking basics", type: "voice", resourceCategory: null, previewImageUrl: null, tags: [], collections: [{ id: "c1", name: "Home Lab" }], createdAt: "" },
  { id: "n5", title: "10 cheap cable organizers under $15", type: "web", resourceCategory: null, previewImageUrl: null, tags: ["desk"], collections: [{ id: "c2", name: "Desk Setup" }], createdAt: "" },
  { id: "n6", title: "used an old shoebox to route the power strip cords out of sight", type: "note", resourceCategory: null, previewImageUrl: null, tags: ["desk"], collections: [{ id: "c2", name: "Desk Setup" }], createdAt: "" },
  { id: "n7", title: "Six standing desks under $600, tested for wobble", type: "web", resourceCategory: null, previewImageUrl: null, tags: ["desk"], collections: [{ id: "c2", name: "Desk Setup" }], createdAt: "" },
  { id: "n8", title: "Screenshot — desk frame spec sheet", type: "image", resourceCategory: null, previewImageUrl: null, tags: ["desk"], collections: [{ id: "c2", name: "Desk Setup" }], createdAt: "" },
  { id: "n9", title: "Uplift V2 assembly manual", type: "document", resourceCategory: null, previewImageUrl: null, tags: ["desk"], collections: [{ id: "c2", name: "Desk Setup" }], createdAt: "" },
  { id: "n10", title: "Research paper — attention is all you need", type: "document", resourceCategory: null, previewImageUrl: null, tags: ["reading list"], collections: [], createdAt: "" },
  { id: "n11", title: "Code snippet — debounce hook", type: "note", resourceCategory: null, previewImageUrl: null, tags: ["dev"], collections: [], createdAt: "" },
  { id: "n12", title: "Recipe — sourdough starter feeding schedule", type: "web", resourceCategory: null, previewImageUrl: null, tags: [], collections: [], createdAt: "" },
];

export const DEMO_EDGES: GraphEdge[] = [
  { source: "n1", target: "n2", kind: "semantic", weight: 0.8 },
  { source: "n1", target: "n3", kind: "tag", weight: 0.6 },
  { source: "n2", target: "n3", kind: "tag", weight: 0.6 },
  { source: "n1", target: "n4", kind: "collection", weight: 0.4 },
  { source: "n2", target: "n4", kind: "collection", weight: 0.4 },
  { source: "n3", target: "n4", kind: "collection", weight: 0.4 },
  // The desk cluster — n5 and n6 share no literal words (the same
  // meaning-only pair used in the Search section), so this is the one
  // "semantic" edge in the demo with zero lexical overlap behind it.
  { source: "n5", target: "n6", kind: "semantic", weight: 0.7 },
  { source: "n7", target: "n8", kind: "tag", weight: 0.5 },
  { source: "n7", target: "n9", kind: "tag", weight: 0.5 },
  { source: "n8", target: "n9", kind: "tag", weight: 0.5 },
  { source: "n5", target: "n7", kind: "collection", weight: 0.35 },
  { source: "n6", target: "n8", kind: "collection", weight: 0.35 },
  { source: "n6", target: "n9", kind: "collection", weight: 0.35 },
];

export function GraphPreviewCard({ className, showLegend = true }: { className?: string; showLegend?: boolean }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className={className ?? "relative h-[420px] overflow-hidden rounded-2xl border border-border bg-card sm:h-[480px]"}>
      <MemoryGraphCanvas nodes={DEMO_NODES} edges={DEMO_EDGES} selectedId={selectedId} onSelect={setSelectedId} />

      <div className="pointer-events-none absolute top-4 left-4 space-y-2 text-[10px] font-semibold">
        <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2 backdrop-blur-sm">
          <p className="text-foreground">
            {DEMO_NODES.length} memories · {DEMO_EDGES.length} connections
          </p>
        </div>
        {showLegend && (
          <div className="hidden space-y-1.5 rounded-xl border border-border/60 bg-background/80 px-3 py-2 backdrop-blur-sm sm:block">
            <div className="flex flex-wrap gap-x-2.5 gap-y-1">
              {NODE_LEGEND.map((type) => (
                <span key={type} className="flex items-center gap-1 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: MEMORY_TYPE_COLORS[type] }} />
                  {type}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-x-2.5 gap-y-1 border-t border-border/40 pt-1.5">
              {EDGE_LEGEND.map((kind) => (
                <span key={kind} className="flex items-center gap-1 text-muted-foreground">
                  <span
                    aria-hidden
                    className="w-3.5 border-t border-muted-foreground/70"
                    style={{ borderTopStyle: kind === "semantic" ? "solid" : kind === "tag" ? "dashed" : "dotted" }}
                  />
                  {EDGE_KIND_LABEL[kind]}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="pointer-events-none absolute right-4 bottom-4 text-[10px] font-medium text-muted-foreground">
        Drag to explore · click a memory to see its connections
      </p>
    </div>
  );
}

export default GraphPreviewCard;
