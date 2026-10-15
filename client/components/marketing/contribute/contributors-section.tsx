import { RevealList } from "@/components/marketing/motion/reveal";
import { GITHUB_URL } from "@/lib/open-source";
import type { Contributor } from "@/lib/github-contributors";

/**
 * Everyone with a commit in Savedly, as GitHub counts them (lib/github-contributors.ts),
 * most commits first, plus a last tile asking the reader to be next. Hidden
 * when the list couldn't be fetched.
 */
export function ContributorsSection({ contributors, h2Class }: { contributors: Contributor[]; h2Class: string }) {
  if (contributors.length === 0) return null;

  return (
    <section aria-labelledby="contributors" className="px-5 py-20 sm:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <div className="max-w-xl">
            <h2 id="contributors" className={h2Class}>
              The people building it
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-pretty text-muted-foreground">
              Everyone whose work is in Savedly, by number of commits. Your first merged pull request adds you here.
            </p>
          </div>
          <a
            href={`${GITHUB_URL}/graphs/contributors`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground"
          >
            {contributors.length} {contributors.length === 1 ? "contributor" : "contributors"} on GitHub
          </a>
        </div>

        <RevealList as="ul" className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" itemClassName="min-w-0">
          {[
            ...contributors.map((person) => (
              <a
                key={person.login}
                href={person.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3.5 rounded-2xl p-4 ring-1 ring-foreground/10 transition-[background-color,box-shadow] duration-300 hover:bg-foreground/[0.03] hover:ring-foreground/20"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- GitHub avatars, sized by GitHub */}
                <img
                  src={`${person.avatarUrl}${person.avatarUrl.includes("?") ? "&" : "?"}s=96`}
                  alt=""
                  width={48}
                  height={48}
                  loading="lazy"
                  className="h-12 w-12 shrink-0 rounded-full bg-muted ring-1 ring-foreground/10 transition-transform duration-300 group-hover:scale-105 motion-reduce:group-hover:scale-100"
                />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium text-foreground">{person.name ?? person.login}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    @{person.login} · {person.commits} {person.commits === 1 ? "commit" : "commits"}
                  </span>
                </span>
              </a>
            )),
            <a
              key="you"
              href="#first-pull-request"
              className="flex h-full items-center gap-3.5 rounded-2xl border border-dashed border-foreground/20 p-4 transition-colors duration-300 hover:border-primary/50 hover:bg-primary/[0.04]"
            >
              <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary/10 text-xl text-primary">
                +
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] font-medium text-foreground">You, next</span>
                <span className="block text-sm text-muted-foreground">Start with a first pull request</span>
              </span>
            </a>,
          ]}
        </RevealList>
      </div>
    </section>
  );
}
