import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { env } from "../../../config/env";
import { logger } from "../../../shared/utils/logger";

// Tells a self-hosted admin when a newer release exists. This is the one
// request an install makes to GitHub on its own, so it can be switched off
// (UPDATE_CHECK=false), it sends nothing about the install, and a failure is
// silent: the admin page just doesn't mention updates.

const RELEASES_URL = "https://api.github.com/repos/jyotishankar04/savedly/releases/latest";
const CHECK_EVERY_MS = 12 * 60 * 60 * 1000;
// After a failure, try again sooner, but not on every page load.
const RETRY_AFTER_MS = 60 * 60 * 1000;

export function appVersion(): string | null {
  try {
    return JSON.parse(readFileSync(resolve("package.json"), "utf8")).version ?? null;
  } catch {
    return null;
  }
}

export interface UpdateStatus {
  current: string | null;
  /** The newest release, or null when the check is off, failed, or there are no releases yet. */
  latest: string | null;
  updateAvailable: boolean;
  /** The release's page on GitHub, for the notes. */
  url: string | null;
}

/** "v1.2.3" or "1.2.3" as numbers; anything after the patch number (a pre-release tag) is ignored. */
function parse(version: string): [number, number, number] | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(version.trim());
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

export function isNewer(latest: string, current: string): boolean {
  const a = parse(latest);
  const b = parse(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}

let cached: { at: number; ttl: number; latest: string | null; url: string | null } | null = null;

async function latestRelease(): Promise<{ latest: string | null; url: string | null }> {
  if (cached && Date.now() - cached.at < cached.ttl) return cached;
  try {
    const response = await fetch(env.UPDATE_CHECK_URL ?? RELEASES_URL, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "savedly-update-check" },
      signal: AbortSignal.timeout(5000),
    });
    // 404 is "this repository has no releases yet": a real answer, not a failure.
    if (response.status === 404) {
      cached = { at: Date.now(), ttl: CHECK_EVERY_MS, latest: null, url: null };
      return cached;
    }
    if (!response.ok) throw new Error(`GitHub answered ${response.status}`);
    const release = (await response.json()) as { tag_name?: string; html_url?: string };
    const latest = release.tag_name && parse(release.tag_name) ? release.tag_name.replace(/^v/, "") : null;
    cached = { at: Date.now(), ttl: CHECK_EVERY_MS, latest, url: latest ? (release.html_url ?? null) : null };
  } catch (err) {
    logger.debug({ err }, "[update-check] couldn't reach the release list");
    cached = { at: Date.now(), ttl: RETRY_AFTER_MS, latest: null, url: null };
  }
  return cached;
}

export async function getUpdateStatus(): Promise<UpdateStatus> {
  const current = appVersion();
  if (!env.UPDATE_CHECK) return { current, latest: null, updateAvailable: false, url: null };
  const { latest, url } = await latestRelease();
  return { current, latest, updateAvailable: !!latest && !!current && isNewer(latest, current), url };
}
