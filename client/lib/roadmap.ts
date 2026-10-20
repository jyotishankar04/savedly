import { API_URL, apiFetch } from "@/lib/auth";

// The public roadmap (/roadmap): what's being built now and what's planned
// next, in order and without dates. Managed from Admin > Roadmap (server:
// modules/roadmap). What has shipped comes from lib/changelog.ts.

export type RoadmapStatus = "now" | "next";

export interface RoadmapItem {
  slug: string;
  status: RoadmapStatus;
  title: string;
  description: string;
  /** The part of Savedly it lands in. */
  area: string | null;
  points: string[];
}

export interface Roadmap {
  now: RoadmapItem[];
  next: (RoadmapItem & { votes: number })[];
}

/** How long the website keeps a copy before asking the API again: an edit in Admin > Roadmap shows within this. */
const REVALIDATE_SECONDS = 60;

/** Read on the website's server, so the roadmap is in the page itself. An unreachable API gives an empty roadmap, not an error page. */
export async function getRoadmap(): Promise<Roadmap> {
  try {
    const res = await fetch(`${API_URL}/roadmap`, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) return { now: [], next: [] };
    const json = (await res.json()) as { success: boolean; data: Roadmap };
    return json.success ? json.data : { now: [], next: [] };
  } catch {
    return { now: [], next: [] };
  }
}

// ---- Admin

export interface AdminRoadmapItem extends RoadmapItem {
  id: string;
  isActive: boolean;
  sortOrder: number;
  votes: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoadmapItemInput {
  status: RoadmapStatus;
  title: string;
  description: string;
  area: string | null;
  points: string[];
  isActive: boolean;
}

export const ROADMAP_STATUS_LABEL: Record<RoadmapStatus, string> = { now: "Working on now", next: "Coming next" };

export const listRoadmapItems = () => apiFetch<AdminRoadmapItem[]>("/admin/roadmap");
export const createRoadmapItem = (input: RoadmapItemInput) => apiFetch<AdminRoadmapItem>("/admin/roadmap", { method: "POST", body: input });
export const updateRoadmapItem = (id: string, input: Partial<RoadmapItemInput>) => apiFetch<AdminRoadmapItem>(`/admin/roadmap/${id}`, { method: "PATCH", body: input });
export const deleteRoadmapItem = (id: string) => apiFetch<AdminRoadmapItem>(`/admin/roadmap/${id}`, { method: "DELETE" });
export const reorderRoadmap = (status: RoadmapStatus, ids: string[]) => apiFetch<AdminRoadmapItem[]>("/admin/roadmap/order", { method: "PUT", body: { status, ids } });
