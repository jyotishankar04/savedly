"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import { forceX, forceY } from "d3-force";
import { useTheme } from "next-themes";
import { MEMORY_TYPE_COLORS } from "@/lib/memory-type-colors";
import type { GraphEdge, GraphNode } from "@/lib/memory-graph";

interface SimNode extends GraphNode {
  degree: number;
  // Written by the force simulation itself.
  x?: number;
  y?: number;
}

interface SimLink {
  source: string | SimNode;
  target: string | SimNode;
  kind: GraphEdge["kind"];
  weight: number;
}

const LINK_DASH: Record<GraphEdge["kind"], number[] | null> = {
  semantic: null,
  tag: [4, 3],
  collection: [1, 3],
};

function linkEndId(end: string | SimNode): string {
  return typeof end === "string" ? end : end.id;
}

export function MemoryGraphCanvas({
  nodes,
  edges,
  selectedId,
  onSelect,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods<SimNode, SimLink> | undefined>(undefined);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // The simulation mutates whatever arrays it's handed — it writes x/y onto
  // nodes and swaps link source/target from ids to node references. Cloning
  // keeps it from corrupting the react-query cache these props come from.
  const graphData = useMemo(() => {
    const degree = new Map<string, number>();
    for (const edge of edges) {
      degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
      degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
    }
    return {
      nodes: nodes.map((node): SimNode => ({ ...node, degree: degree.get(node.id) ?? 0 })),
      links: edges.map((edge): SimLink => ({ ...edge })),
    };
  }, [nodes, edges]);

  // Ids connected to the selection — everything else dims, so one click shows
  // a memory's neighbourhood instead of just which dot was hit.
  const neighborIds = useMemo(() => {
    if (!selectedId) return null;
    const ids = new Set<string>([selectedId]);
    for (const edge of edges) {
      if (edge.source === selectedId) ids.add(edge.target);
      else if (edge.target === selectedId) ids.add(edge.source);
    }
    return ids;
  }, [selectedId, edges]);

  // Nothing pulls a memory with no connections back toward the others, so
  // charge repulsion alone flings them off to infinity — which then drags
  // zoomToFit out until the real graph is a speck. A weak pull toward the
  // origin keeps them as a loose halo around the connected core instead.
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || graphData.nodes.length === 0) return;

    graph.d3Force("x", forceX(0).strength(0.045));
    graph.d3Force("y", forceY(0).strength(0.045));
    graph.d3ReheatSimulation();
    // size.width gates whether ForceGraph2D is mounted at all, so it belongs
    // here — without it this runs before the ref is ever assigned.
  }, [graphData, size.width]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const nodeRadius = (node: SimNode) => 3 + Math.sqrt(node.degree) * 1.4;

  return (
    <div ref={containerRef} className="h-full w-full">
      {size.width > 0 && (
        <ForceGraph2D
          ref={graphRef}
          width={size.width}
          height={size.height}
          graphData={graphData}
          backgroundColor="rgba(0,0,0,0)"
          cooldownTicks={120}
          d3VelocityDecay={0.3}
          // Without this the settled layout sits wherever the simulation left
          // it — usually small and off to one side of a large viewport.
          onEngineStop={() => graphRef.current?.zoomToFit(400, 60)}
          onNodeClick={(node) => onSelect((node as SimNode).id)}
          onBackgroundClick={() => onSelect(null)}
          nodeLabel={(node) => (node as SimNode).title}
          nodePointerAreaPaint={(node, color, ctx) => {
            const simNode = node as SimNode;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(simNode.x ?? 0, simNode.y ?? 0, nodeRadius(simNode) + 2, 0, 2 * Math.PI);
            ctx.fill();
          }}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const simNode = node as SimNode;
            const radius = nodeRadius(simNode);
            const dimmed = neighborIds ? !neighborIds.has(simNode.id) : false;
            const isSelected = simNode.id === selectedId;

            ctx.globalAlpha = dimmed ? 0.15 : 1;

            ctx.beginPath();
            ctx.arc(simNode.x ?? 0, simNode.y ?? 0, radius, 0, 2 * Math.PI);
            ctx.fillStyle = MEMORY_TYPE_COLORS[simNode.type] ?? "#94a3b8";
            ctx.fill();

            if (isSelected) {
              ctx.lineWidth = 2 / globalScale;
              ctx.strokeStyle = isDark ? "#ffffff" : "#0f172a";
              ctx.stroke();
            }

            // Labels only once zoomed in enough to read them, and only for
            // nodes worth labelling — otherwise it's a wall of overlapping text.
            const showLabel = globalScale > 1.6 && (isSelected || !dimmed) && (simNode.degree > 0 || globalScale > 3);
            if (showLabel) {
              const fontSize = 10 / globalScale;
              ctx.font = `${fontSize}px ui-sans-serif, system-ui, sans-serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              ctx.fillStyle = isDark ? "rgba(226,232,240,0.85)" : "rgba(15,23,42,0.75)";
              const label = simNode.title.length > 28 ? `${simNode.title.slice(0, 27)}…` : simNode.title;
              ctx.fillText(label, simNode.x ?? 0, (simNode.y ?? 0) + radius + 1.5 / globalScale);
            }

            ctx.globalAlpha = 1;
          }}
          linkCanvasObject={(link, ctx, globalScale) => {
            const simLink = link as SimLink;
            const source = simLink.source as SimNode;
            const target = simLink.target as SimNode;
            if (typeof source !== "object" || typeof target !== "object") return;

            const dimmed = neighborIds
              ? !(neighborIds.has(linkEndId(simLink.source)) && neighborIds.has(linkEndId(simLink.target)))
              : false;

            ctx.save();
            ctx.globalAlpha = dimmed ? 0.04 : 0.12 + simLink.weight * 0.35;
            ctx.strokeStyle = isDark ? "#94a3b8" : "#475569";
            ctx.lineWidth = (0.4 + simLink.weight * 1.1) / globalScale;

            const dash = LINK_DASH[simLink.kind];
            if (dash) ctx.setLineDash(dash.map((segment) => segment / globalScale));

            ctx.beginPath();
            ctx.moveTo(source.x ?? 0, source.y ?? 0);
            ctx.lineTo(target.x ?? 0, target.y ?? 0);
            ctx.stroke();
            ctx.restore();
          }}
        />
      )}
    </div>
  );
}
