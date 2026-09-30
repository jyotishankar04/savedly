import { apiFetch } from "@/lib/auth";
import type { Contribution, ContributionLevel } from "@/components/ui/github-activity";

export interface CountedLabel {
  label: string;
  count: number;
}

export interface DateCount {
  date: string;
  count: number;
}

export interface Insights {
  totals: {
    memories: number;
    collections: number;
    tags: number;
    favorites: number;
    thisWeek: number;
  };
  byType: CountedLabel[];
  byCategory: CountedLabel[];
  byCaptureMethod: CountedLabel[];
  topTags: CountedLabel[];
  topCollections: CountedLabel[];
  topDomains: CountedLabel[];
  /** Only days that had saves — the heatmap fills the gaps itself. */
  activity: DateCount[];
  /** How many days `activity` covers on this plan (30 without the full-year feature). */
  historyDays?: number;
}

export async function getInsights(): Promise<Insights> {
  return apiFetch<Insights>("/insights");
}

/** "ui_design_inspiration" -> "Ui design inspiration" — these come from an open AI vocabulary, not a fixed enum. */
export function humanizeLabel(label: string): string {
  const spaced = label.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function toLocalKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * The API only returns days that had saves; GitHubActivity wants a dense,
 * chronological run of days ending today. Levels are scaled against the
 * user's own busiest day rather than fixed thresholds, so the grid reads the
 * same whether someone saves three a week or sixty.
 *
 * Dates are built and compared in local time — the server's `date(created_at)`
 * is local too, and going through toISOString() here would shift days by one
 * either side of UTC midnight.
 */
export function toContributions(activity: DateCount[], weeks = 27): Contribution[] {
  const counts = new Map(activity.map((entry) => [entry.date, entry.count]));
  const max = activity.reduce((highest, entry) => Math.max(highest, entry.count), 0);

  const level = (count: number): ContributionLevel => {
    if (count === 0 || max === 0) return 0;
    const ratio = count / max;
    if (ratio > 0.66) return 4;
    if (ratio > 0.33) return 3;
    if (ratio > 0.12) return 2;
    return 1;
  };

  const days = weeks * 7;
  const today = new Date();

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - 1 - index));
    const key = toLocalKey(date);
    const count = counts.get(key) ?? 0;
    return { date: key, count, level: level(count) };
  });
}

/**
 * Keeps the biggest `limit` entries and rolls everything else into one
 * "Other" row, so a long tail of single-item categories doesn't turn a chart
 * into unreadable confetti.
 */
export function withTail(items: CountedLabel[], limit: number): CountedLabel[] {
  if (items.length <= limit) return items;

  const head = items.slice(0, limit);
  const tail = items.slice(limit).reduce((sum, item) => sum + item.count, 0);
  return tail > 0 ? [...head, { label: "Other", count: tail }] : head;
}
