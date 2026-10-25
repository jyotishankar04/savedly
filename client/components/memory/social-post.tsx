"use client";

import { Fragment, useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon as ChevronDown,
  Comment01Icon as Comments,
  FavouriteIcon as Likes,
  LinkSquare02Icon as ExternalLink,
  PlayIcon as Play,
  Search01Icon as Search,
  ViewIcon as Views,
} from "@hugeicons/core-free-icons";
import { getPlatformFallback } from "@/lib/platform-fallback";
import { cn } from "@/lib/utils";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { VideoPlayer } from "@/components/ui/video-player";
import type { SocialPost } from "@/types/memory";

const compact = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });

/** 75 → "1:15", 3725 → "1:02:05". */
function clock(seconds: number) {
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = Math.floor(seconds % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

/** A post's text with its web addresses as links (the text itself is never parsed as HTML). */
function Linked({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s<>"]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noreferrer nofollow" className="text-primary underline decoration-primary/30 underline-offset-2 [overflow-wrap:anywhere] hover:decoration-primary">
            {part.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
          </a>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

/** Words found by the transcript's search, marked. */
function Marked({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const out: React.ReactNode[] = [];
  let at = 0;
  for (let i = lower.indexOf(q); i !== -1; i = lower.indexOf(q, i + q.length)) {
    out.push(text.slice(at, i), <mark key={i} className="rounded-sm bg-amber-300/60 px-px text-foreground dark:bg-amber-400/40">{text.slice(i, i + q.length)}</mark>);
    at = i + q.length;
  }
  out.push(text.slice(at));
  return <>{out}</>;
}

/** Width ÷ height; anything narrower than square plays in a phone-shaped frame, centred. */
const isTall = (aspect: number | undefined) => !!aspect && aspect < 0.9;

/**
 * A post's video or pictures, in place:
 * - YouTube in its privacy-friendly player (the transcript and chapters seek it);
 * - a video file the browser plays itself (X, LinkedIn) in a plain video player;
 * - TikTok, Instagram reels and Facebook videos in the player each publishes for embedding;
 * - pictures, which open full screen (all of a post's photos, ← → between them).
 * A video with none of those shows its picture and opens on the platform.
 */
function PostMedia({ post, start, processing, imageFailed, onImageFailed }: { post: SocialPost; start: number | null; processing: boolean; imageFailed: boolean; onImageFailed: () => void }) {
  const [viewing, setViewing] = useState<number | null>(null);
  const label = post.title ?? post.text?.slice(0, 120) ?? getPlatformFallback(post.platform).label;
  const video = post.media?.find((m) => m.type === "video");
  const playable = post.media?.find((m) => m.type === "video" && m.src);
  const photos = (post.media ?? []).filter((m) => m.type === "image").map((m) => ({ src: m.url, alt: label }));
  const frame = (aspect: number | undefined, children: React.ReactNode, id?: string) => (
    <div id={id} className={cn("relative overflow-hidden rounded-2xl border border-border/60 bg-black", isTall(aspect) && "mx-auto w-full max-w-[360px]")} style={{ aspectRatio: aspect ?? 16 / 9 }}>
      {children}
    </div>
  );

  if (post.embed?.provider === "youtube" && post.embed.id) {
    return frame(
      post.embed.aspect,
      <iframe
        key={start ?? "start"}
        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(post.embed.id)}?rel=0${start !== null ? `&start=${start}&autoplay=1` : ""}`}
        title={post.title ?? "YouTube video"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="absolute inset-0 size-full"
      />,
      "social-player",
    );
  }
  if (playable?.src) {
    return (
      <VideoPlayer
        src={playable.src}
        poster={playable.thumbnailUrl}
        aspect={playable.aspect}
        label={label}
        // X's video server turns away requests that come from another site.
        noReferrer={post.platform === "x"}
        fallbackHref={post.url}
        className={isTall(playable.aspect) ? "mx-auto w-full max-w-[360px]" : "w-full"}
      />
    );
  }
  if (post.embed?.src) {
    return frame(
      post.embed.aspect,
      <iframe
        src={post.embed.src}
        title={`${getPlatformFallback(post.platform).label}: ${label}`}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        className="absolute inset-0 size-full bg-white"
      />,
    );
  }
  if (photos.length && !imageFailed) {
    const shimmer = processing && (
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        <div className="absolute inset-y-0 left-0 w-1/3 animate-shine-sweep bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      </div>
    );
    return (
      <>
        {photos.length === 1 ? (
          <button type="button" onClick={() => setViewing(0)} aria-label="View the picture full screen" className="relative block w-full cursor-zoom-in overflow-hidden rounded-2xl border border-border/60 bg-muted/40">
            {shimmer}
            {/* eslint-disable-next-line @next/next/no-img-element -- the platform's own image, from its own domain */}
            <img src={photos[0]!.src} alt={label} onError={onImageFailed} className="mx-auto max-h-[520px] w-full object-contain" />
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-1 overflow-hidden rounded-2xl border border-border/60">
            {photos.slice(0, 4).map((photo, i) => (
              <button key={photo.src} type="button" onClick={() => setViewing(i)} aria-label={`View picture ${i + 1} of ${photos.length} full screen`} className={cn("relative block cursor-zoom-in bg-muted/40", photos.length === 3 && i === 0 ? "row-span-2" : "aspect-square")}>
                {/* eslint-disable-next-line @next/next/no-img-element -- the platform's own image */}
                <img src={photo.src} alt={label} className="size-full object-cover" />
                {i === 3 && photos.length > 4 && <span className="absolute inset-0 grid place-items-center bg-black/50 text-lg font-semibold text-white">+{photos.length - 4}</span>}
              </button>
            ))}
          </div>
        )}
        <ImageLightbox images={photos} index={viewing} onIndexChange={setViewing} onClose={() => setViewing(null)} originalUrl={post.url} />
      </>
    );
  }
  if (video?.thumbnailUrl && !imageFailed) {
    return (
      <a href={post.url} target="_blank" rel="noreferrer" className="group relative block overflow-hidden rounded-2xl border border-border/60 bg-muted/40">
        {/* eslint-disable-next-line @next/next/no-img-element -- the platform's own image */}
        <img src={video.thumbnailUrl} alt={label} onError={onImageFailed} className="mx-auto max-h-[520px] w-full object-contain" />
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid size-14 place-items-center rounded-full bg-black/60 text-white backdrop-blur transition-transform group-hover:scale-105">
            <HugeiconsIcon icon={Play} strokeWidth={2} className="size-6" />
          </span>
        </span>
      </a>
    );
  }
  return null;
}

/**
 * A social post or video on its memory's page, as read from the platform:
 * who posted it and when, what it says, its picture or (for YouTube) the
 * video itself with its chapters and transcript, which jump the player to
 * where it's said.
 */
export function SocialPostView({ post, processing = false }: { post: SocialPost; processing?: boolean }) {
  const platform = getPlatformFallback(post.platform).label;
  // The player starts where a chapter or a transcript line says; a new start reloads it there.
  const [start, setStart] = useState<number | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [find, setFind] = useState("");
  const [imageFailed, setImageFailed] = useState(false);

  const segments = useMemo(() => {
    const all = post.transcript?.segments ?? [];
    const q = find.trim().toLowerCase();
    return q ? all.filter((s) => s.text.toLowerCase().includes(q)) : all;
  }, [post.transcript, find]);

  // Only a video playing here has times to jump to (a LinkedIn video's transcript is one block of text).
  const timed = post.embed?.provider === "youtube";
  const date = post.publishedAt ? new Date(post.publishedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : null;
  const who = post.author?.name ?? (post.author?.handle ? `@${post.author.handle}` : null);
  const seek = (seconds: number) => {
    setStart(seconds);
    document.getElementById("social-player")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <section className="space-y-4">
      {/* The video or the pictures, played and shown right here; the platform is one click away, not the only way. */}
      <PostMedia post={post} start={start} processing={processing} imageFailed={imageFailed} onImageFailed={() => setImageFailed(true)} />

      <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
        <div className="flex items-start gap-3">
          {post.author?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- the author's picture, from the platform
            <img src={post.author.avatarUrl} alt="" className="size-10 shrink-0 rounded-full bg-muted object-cover" />
          ) : (
            <span className={cn("grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white", getPlatformFallback(post.platform).gradientClassName)} aria-hidden>
              {(who ?? platform).replace(/^@/, "").charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {post.author?.url ? (
                <a href={post.author.url} target="_blank" rel="noreferrer" className="hover:underline">
                  {who ?? platform}
                </a>
              ) : (
                (who ?? platform)
              )}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {[post.author?.name && post.author?.handle ? `@${post.author.handle}` : null, platform, date, post.durationSeconds ? clock(post.durationSeconds) : null].filter(Boolean).join(" · ")}
            </p>
          </div>
          <a href={post.url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/10">
            Open on {platform}
            <HugeiconsIcon icon={ExternalLink} strokeWidth={2.25} className="size-3" />
          </a>
        </div>

        {post.title && post.platform === "youtube" && <h2 className="mt-4 text-base font-semibold leading-snug text-foreground">{post.title}</h2>}
        {post.title && post.platform === "reddit" && <h2 className="mt-4 text-base font-semibold leading-snug text-foreground">{post.title}</h2>}
        {post.text && (
          <p className={cn("mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground [overflow-wrap:anywhere]", post.platform === "youtube" && "line-clamp-6 text-sm text-muted-foreground")}>
            <Linked text={post.text} />
          </p>
        )}
        {post.quoted && (
          <blockquote className="mt-3 rounded-xl border border-border/70 px-3.5 py-2.5 text-sm text-muted-foreground">
            {post.quoted.author && <span className="font-semibold text-foreground">@{post.quoted.author} </span>}
            <Linked text={post.quoted.text} />
          </blockquote>
        )}

        {post.stats && (post.stats.likes || post.stats.comments || post.stats.views) ? (
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            {post.stats.views ? <span className="inline-flex items-center gap-1.5"><HugeiconsIcon icon={Views} strokeWidth={2} className="size-3.5" />{compact.format(post.stats.views)} views</span> : null}
            {post.stats.likes ? <span className="inline-flex items-center gap-1.5"><HugeiconsIcon icon={Likes} strokeWidth={2} className="size-3.5" />{compact.format(post.stats.likes)}</span> : null}
            {post.stats.comments ? <span className="inline-flex items-center gap-1.5"><HugeiconsIcon icon={Comments} strokeWidth={2} className="size-3.5" />{compact.format(post.stats.comments)}</span> : null}
          </div>
        ) : null}
      </div>

      {post.chapters && post.chapters.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
          <h3 className="mb-2 text-xs font-bold text-foreground">Chapters</h3>
          <ol className="space-y-0.5">
            {post.chapters.map((chapter) => (
              <li key={chapter.start}>
                <button type="button" onClick={() => seek(chapter.start)} className="flex w-full items-baseline gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted">
                  <span className="w-12 shrink-0 font-mono text-xs tabular-nums text-primary">{clock(chapter.start)}</span>
                  <span className="min-w-0 text-foreground">{chapter.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}

      {post.transcript && post.transcript.segments.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card">
          <button type="button" aria-expanded={transcriptOpen} onClick={() => setTranscriptOpen((open) => !open)} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left sm:px-5">
            <span>
              <span className="text-xs font-bold text-foreground">Transcript</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {timed ? `${post.transcript.segments.length} lines` : "from the post"}
                {post.transcript.translatedFrom ? " · translated to English" : post.transcript.auto ? " · auto-generated" : ""}
              </span>
            </span>
            <HugeiconsIcon icon={ChevronDown} strokeWidth={2} className={cn("size-4 text-muted-foreground transition-transform", transcriptOpen && "rotate-180")} />
          </button>
          {transcriptOpen && (
            <div className="border-t border-border/60 px-4 pb-4 pt-3 sm:px-5">
              <label className="mb-3 flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 focus-within:border-primary/40">
                <HugeiconsIcon icon={Search} strokeWidth={2} className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="sr-only">Find in the transcript</span>
                <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find in the transcript" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
              </label>
              {segments.length === 0 ? (
                <p className="px-2 py-3 text-sm text-muted-foreground">Not said in this video.</p>
              ) : (
                <ol className="max-h-[420px] space-y-0.5 overflow-y-auto">
                  {!timed && segments.map((segment, i) => (
                    <li key={i} className="whitespace-pre-wrap px-2 py-1 text-sm leading-relaxed text-foreground/90">
                      <Marked text={segment.text} query={find.trim()} />
                    </li>
                  ))}
                  {timed && segments.map((segment, i) => (
                    <li key={`${segment.start}-${i}`}>
                      <button type="button" onClick={() => seek(segment.start)} className="flex w-full items-baseline gap-3 rounded-lg px-2 py-1 text-left text-sm transition-colors hover:bg-muted" title="Play from here">
                        <span className="w-12 shrink-0 font-mono text-xs tabular-nums text-primary">{clock(segment.start)}</span>
                        <span className="min-w-0 text-foreground/90">
                          <Marked text={segment.text} query={find.trim()} />
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
