"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Loading03Icon as Spinner,
  PauseIcon,
  PlayIcon,
  VolumeHighIcon as Sound,
  VolumeOffIcon as Muted,
  ArrowExpand01Icon as FullScreen,
  ArrowShrink02Icon as ExitFullScreen,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

const SPEEDS = [1, 1.25, 1.5, 2];
const time = (s: number) => {
  if (!Number.isFinite(s)) return "0:00";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
};

/**
 * Savedly's video player (the look of the extension page's clips): a play
 * button, a scrubber with what's loaded, the time, sound, speed and full
 * screen, over the picture; it takes the video's own shape. Keys while it's
 * focused: space or K plays and pauses, ← → jump 5 seconds, M mutes, F goes
 * full screen. While playing, the controls fade after a moment and come back
 * when the pointer moves or the video is tapped.
 *
 * `noReferrer` keeps the page's address out of the video's request (X's
 * video server refuses requests that come from another site).
 */
export function VideoPlayer({
  src,
  poster,
  aspect,
  label,
  autoPlay = false,
  muted: startMuted = false,
  loop = false,
  noReferrer = false,
  fallbackHref,
  className,
  videoClassName,
}: {
  src: string;
  poster?: string;
  /** Width ÷ height; otherwise the video's own once it loads (16:9 until then). */
  aspect?: number;
  label: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  noReferrer?: boolean;
  /** Where the video can be watched when it won't play here. */
  fallbackHref?: string;
  className?: string;
  videoClassName?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const idle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(autoPlay);
  const [waiting, setWaiting] = useState(false);
  const [now, setNow] = useState(0);
  const [length, setLength] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [muted, setMuted] = useState(startMuted);
  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [full, setFull] = useState(false);
  const [shown, setShown] = useState(true);
  const [failed, setFailed] = useState(false);
  const [natural, setNatural] = useState<number | undefined>(undefined);
  // With noReferrer the source is set only once the page's policy says so.
  const [ready, setReady] = useState(!noReferrer);

  useEffect(() => {
    if (!noReferrer) return;
    const meta = document.createElement("meta");
    meta.name = "referrer";
    meta.content = "no-referrer";
    document.head.appendChild(meta);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the source waits for the policy above
    setReady(true);
    return () => meta.remove();
  }, [noReferrer]);

  useEffect(() => {
    const onChange = () => setFull(document.fullscreenElement === box.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // While playing, the controls step aside after a moment of no movement.
  const wake = useCallback(() => {
    setShown(true);
    clearTimeout(idle.current);
    idle.current = setTimeout(() => {
      if (video.current && !video.current.paused) setShown(false);
    }, 2500);
  }, []);
  useEffect(() => () => clearTimeout(idle.current), []);

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    setStarted(true);
    if (v.paused) void v.play().catch(() => undefined);
    else v.pause();
  };
  const jump = (by: number) => {
    const v = video.current;
    if (v) v.currentTime = Math.max(0, Math.min((v.duration || 0) - 0.1, v.currentTime + by));
  };
  const toggleMute = () => {
    const v = video.current;
    if (!v) return;
    v.muted = !v.muted;
    if (!v.muted && v.volume === 0) v.volume = 1;
  };
  const toggleFull = () => {
    const el = box.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
    const v = video.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (el?.requestFullscreen) void el.requestFullscreen().catch(() => v?.webkitEnterFullscreen?.());
    // iPhone Safari: only the video itself goes full screen.
    else v?.webkitEnterFullscreen?.();
  };
  const nextSpeed = () => {
    const v = video.current;
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]!;
    if (v) v.playbackRate = next;
    setSpeed(next);
  };

  const shape = aspect ?? natural ?? 16 / 9;
  const controlsVisible = shown || !playing;

  if (failed) {
    return (
      <div className={cn("relative grid place-items-center overflow-hidden rounded-2xl border border-border/60 bg-black text-center text-white", className)} style={{ aspectRatio: shape }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- the video's own picture */}
        {poster && <img src={poster} alt="" className="absolute inset-0 size-full object-cover opacity-30" />}
        <div className="relative space-y-2 p-4">
          <p className="text-sm font-medium">This video won&apos;t play here.</p>
          {fallbackHref && (
            <a href={fallbackHref} target="_blank" rel="noreferrer" className="inline-block rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25">
              Watch it on the site
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={box}
      tabIndex={0}
      role="group"
      aria-label={label}
      onPointerMove={wake}
      onKeyDown={(e) => {
        if (e.target instanceof HTMLInputElement) return;
        const key = e.key.toLowerCase();
        if (key === " " || key === "k") { e.preventDefault(); toggle(); }
        else if (key === "arrowright") { e.preventDefault(); jump(5); }
        else if (key === "arrowleft") { e.preventDefault(); jump(-5); }
        else if (key === "m") toggleMute();
        else if (key === "f") toggleFull();
        wake();
      }}
      className={cn(
        "group/player relative overflow-hidden rounded-2xl border border-border/60 bg-black outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        full && "rounded-none border-0",
        !controlsVisible && "cursor-none",
        className,
      )}
      style={full ? undefined : { aspectRatio: shape }}
    >
      <video
        ref={video}
        src={ready ? src : undefined}
        poster={poster}
        autoPlay={autoPlay}
        muted={startMuted}
        loop={loop}
        playsInline
        preload="metadata"
        aria-label={label}
        onClick={() => {
          toggle();
          wake();
        }}
        onPlay={() => {
          setPlaying(true);
          wake();
        }}
        onPause={() => {
          setPlaying(false);
          setShown(true);
        }}
        onWaiting={() => setWaiting(true)}
        onPlaying={() => setWaiting(false)}
        onCanPlay={() => setWaiting(false)}
        onLoadedMetadata={(e) => {
          setLength(e.currentTarget.duration);
          const { videoWidth: w, videoHeight: h } = e.currentTarget;
          if (w && h) setNatural(w / h);
        }}
        onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
        onProgress={(e) => {
          const b = e.currentTarget.buffered;
          if (b.length) setLoaded(b.end(b.length - 1));
        }}
        onVolumeChange={(e) => {
          setMuted(e.currentTarget.muted);
          setVolume(e.currentTarget.volume);
        }}
        onError={() => setFailed(true)}
        className={cn("absolute inset-0 size-full cursor-pointer bg-black object-contain", videoClassName)}
      />

      {/* Before it's started: one big button, over the picture. */}
      {!started && !playing && (
        <button type="button" onClick={toggle} aria-label="Play video" className="absolute inset-0 grid place-items-center">
          <span className="grid size-16 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition-transform hover:scale-105">
            <HugeiconsIcon icon={PlayIcon} strokeWidth={2} className="size-7 fill-white" />
          </span>
        </button>
      )}
      {waiting && playing && (
        <span className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden>
          <HugeiconsIcon icon={Spinner} strokeWidth={2} className="size-9 animate-spin text-white/90 motion-reduce:animate-none" />
        </span>
      )}

      {started && (
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2.5 pt-10 text-white transition-opacity duration-300 sm:gap-3 sm:px-4 sm:pb-3",
            controlsVisible ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" onClick={toggle} aria-label={playing ? "Pause video" : "Play video"} className="grid size-8 shrink-0 place-items-center rounded-full transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
            <HugeiconsIcon icon={playing ? PauseIcon : PlayIcon} strokeWidth={2} className="size-4 fill-white" />
          </button>
          <input
            type="range"
            min={0}
            max={length || 1}
            step={0.01}
            value={now}
            aria-label="Seek"
            aria-valuetext={`${time(now)} of ${time(length)}`}
            onChange={(e) => {
              const v = video.current;
              if (v) v.currentTime = Number(e.target.value);
              setNow(Number(e.target.value));
            }}
            className="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full accent-white [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
            style={{
              background: `linear-gradient(to right, white ${(now / (length || 1)) * 100}%, rgba(255,255,255,.45) ${(now / (length || 1)) * 100}%, rgba(255,255,255,.45) ${(loaded / (length || 1)) * 100}%, rgba(255,255,255,.2) 0)`,
            }}
          />
          <span className="shrink-0 font-mono text-[11px] tabular-nums text-white/85 sm:text-xs">
            {time(now)} / {time(length)}
          </span>
          <div className="group/volume flex shrink-0 items-center">
            <button type="button" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"} className="grid size-8 place-items-center rounded-full transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
              <HugeiconsIcon icon={muted || volume === 0 ? Muted : Sound} strokeWidth={2} className="size-4" />
            </button>
            {/* The volume slider opens beside the button on a computer; a phone has its own buttons. */}
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              aria-label="Volume"
              onChange={(e) => {
                const v = video.current;
                if (!v) return;
                v.volume = Number(e.target.value);
                v.muted = v.volume === 0;
              }}
              className="hidden h-1 w-0 cursor-pointer appearance-none rounded-full bg-white/30 accent-white opacity-0 transition-[width,opacity] duration-200 group-hover/volume:w-16 group-hover/volume:opacity-100 focus:w-16 focus:opacity-100 sm:block [&::-webkit-slider-thumb]:size-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
            />
          </div>
          <button type="button" onClick={nextSpeed} aria-label={`Speed ${speed}×`} title="Speed" className="h-8 shrink-0 rounded-full px-2 font-mono text-[11px] font-semibold tabular-nums transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:text-xs">
            {speed}×
          </button>
          <button type="button" onClick={toggleFull} aria-label={full ? "Leave full screen" : "Full screen"} className="grid size-8 shrink-0 place-items-center rounded-full transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
            <HugeiconsIcon icon={full ? ExitFullScreen : FullScreen} strokeWidth={2} className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
