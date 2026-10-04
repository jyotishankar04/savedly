import { PublicMemoryCard } from "@/components/share/public-memory-card";
import type { SharedResourcePayload } from "@/lib/shares";

/**
 * The contents of a shared link, once access has been decided.
 *
 * Rendered both server-side (a public link, where this is also what
 * crawlers see) and client-side (after unlocking, or for a grantee), so it
 * stays a plain presentational component with no data fetching of its own.
 */
export function SharedResourceView({ payload }: { payload: SharedResourcePayload }) {
  const { collection, memories } = payload;
  const isSingleMemory = payload.resourceType === "memory";
  const single = isSingleMemory ? memories[0] : null;

  return (
    <>
      <header className="mb-8 space-y-2 border-b border-border/20 pb-6">
        {collection ? (
          <>
            <span className="text-3xl">{collection.icon}</span>
            <h1 className="text-3xl font-bold tracking-tight">{collection.name}</h1>
            {collection.description && (
              <p className="max-w-xl text-sm text-muted-foreground">{collection.description}</p>
            )}
          </>
        ) : (
          <h1 className="text-3xl font-bold tracking-tight">{single?.title ?? "Shared memory"}</h1>
        )}

        <p className="pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {isSingleMemory
            ? "Shared via SaveForLatter"
            : `${memories.length} ${memories.length === 1 ? "memory" : "memories"} · shared via SaveForLatter`}
          {payload.ownerName && ` · by ${payload.ownerName}`}
        </p>
      </header>

      {memories.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {isSingleMemory ? "This memory is no longer available." : "This collection is empty."}
        </p>
      ) : isSingleMemory ? (
        <SingleMemory payload={payload} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {memories.map((item) => (
            <PublicMemoryCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </>
  );
}

/** One memory gets a fuller treatment than a grid tile — it's the whole page. */
function SingleMemory({ payload }: { payload: SharedResourcePayload }) {
  const item = payload.memories[0];
  const body = item.description || item.content;

  return (
    <article className="rounded-surface border border-border/60 bg-card p-6 space-y-4">
      {item.previewImageUrl && (
        // Not next/image: these are arbitrary third-party hosts that would
        // each need allowlisting in next.config, and this is a rarely-hit
        // public page rather than a hot path worth optimising.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.previewImageUrl}
          alt=""
          className="max-h-80 w-full rounded-xl border border-border/40 object-cover"
        />
      )}

      {body && <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{body}</p>}

      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="inline-block break-all text-xs font-medium text-primary hover:underline"
        >
          {item.url}
        </a>
      )}
    </article>
  );
}
