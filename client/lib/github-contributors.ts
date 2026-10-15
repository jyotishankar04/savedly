import { GITHUB_URL } from "@/lib/open-source";

export interface Contributor {
  login: string;
  /** Their GitHub display name, or null when they haven't set one. */
  name: string | null;
  avatarUrl: string;
  profileUrl: string;
  commits: number;
}

// owner/repo, from the one GitHub URL the site uses.
const REPO = GITHUB_URL.replace(/^https:\/\/github\.com\//, "");
// Refetched every six hours: a handful of GitHub calls a day, and a new
// contributor shows up the same day their first pull request is merged.
const REVALIDATE = 6 * 60 * 60;

function headers(): HeadersInit {
  // Optional: with a token GitHub allows far more calls than the 60 an hour
  // it gives an anonymous server (which a shared host's address can run out
  // of). Read-only public data either way.
  const token = process.env.GITHUB_TOKEN;
  return { Accept: "application/vnd.github+json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

/**
 * The people who have commits in the repository's default branch, most
 * commits first, as GitHub counts them. Bots (Copilot, GitHub apps) are left
 * out. Empty if GitHub can't be reached, so the section showing them can hide
 * itself instead of breaking the page.
 */
export async function getContributors(): Promise<Contributor[]> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/contributors?per_page=100`, {
      headers: headers(),
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) return [];
    const list = (await res.json()) as { login: string; type: string; avatar_url: string; html_url: string; contributions: number }[];
    const people = list.filter((c) => c.type === "User" && !c.login.endsWith("[bot]"));

    // Display names come from each person's profile. Best effort: a failed
    // lookup just shows their username.
    return await Promise.all(
      people.slice(0, 48).map(async (c) => {
        let name: string | null = null;
        try {
          const profile = await fetch(`https://api.github.com/users/${c.login}`, { headers: headers(), next: { revalidate: REVALIDATE } });
          if (profile.ok) name = ((await profile.json()) as { name: string | null }).name?.trim() || null;
        } catch {
          // keep the username
        }
        return { login: c.login, name, avatarUrl: c.avatar_url, profileUrl: c.html_url, commits: c.contributions };
      }),
    );
  } catch {
    return [];
  }
}
