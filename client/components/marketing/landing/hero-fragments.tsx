import type { CSSProperties } from "react";

// Faded shapes of saved things (link cards, notes, a screenshot, a video)
// drifting in from both sides of the landing hero: solid at the screen
// edge, gone before the headline. Brand blue, with a little warm peach in
// light mode (on black it turns muddy, so dark mode is blue only). Only on
// wide screens, where there's room beside the headline.

type Kind = "link" | "note" | "shot" | "video" | "bar";
/** [inset from the screen edge, top, width, height, kind, warm?, strength 0–1] */
type Fragment = [number, number, number, number, Kind, boolean, number];

const LEFT: Fragment[] = [
  [-30, 30, 230, 54, "link", false, 0.9],
  [70, 104, 140, 28, "bar", false, 0.55],
  [-20, 150, 180, 120, "shot", false, 0.8],
  [150, 196, 120, 36, "bar", true, 0.7],
  [-40, 300, 250, 66, "note", false, 0.7],
  [100, 392, 160, 30, "bar", false, 0.45],
];
const RIGHT: Fragment[] = [
  [40, 0, 170, 32, "bar", false, 0.5],
  [-30, 56, 240, 118, "video", false, 0.9],
  [180, 120, 100, 30, "bar", true, 0.75],
  [-10, 206, 200, 58, "link", false, 0.75],
  [-40, 300, 150, 30, "bar", false, 0.5],
  [30, 352, 240, 70, "note", true, 0.6],
];

// --k scales every tint: a little stronger on black, where tints read weaker.
const ROOT = "pointer-events-none absolute top-[9.5rem] -z-10 hidden h-[29rem] w-[300px] overflow-hidden blur-[0.5px] xl:block [--k:26] [--warm:oklch(0.82_0.09_45)] dark:[--k:32] dark:[--warm:var(--brand)]";
const mix = (strength: number) => `color-mix(in oklab, var(--c) calc(var(--k) * ${strength}%), transparent)`;

function Piece({ fragment: [inset, top, width, height, kind, warm, s], side }: { fragment: Fragment; side: "left" | "right" }) {
  const style = {
    "--c": warm ? "var(--warm)" : "var(--brand)",
    [side]: inset,
    top,
    width,
    height,
    borderRadius: kind === "bar" ? 6 : 12,
    background: `linear-gradient(${side === "left" ? 90 : 270}deg, ${mix(s)}, ${mix(s * 0.45)} 70%, ${mix(s * 0.15)})`,
  } as CSSProperties;
  const ink = { background: mix(Math.min(s * 1.6, 3.5)) };
  return (
    <div className="absolute" style={style}>
      {kind === "link" && (
        <>
          <i className="absolute top-[9px] left-[10px] rounded-lg" style={{ ...ink, width: height - 18, height: height - 18 }} />
          <i className="absolute h-1.5 rounded-full" style={{ ...ink, left: height + 2, top: height / 2 - 9, width: width * 0.45 }} />
          <i className="absolute h-[5px] rounded-full opacity-60" style={{ ...ink, left: height + 2, top: height / 2 + 3, width: width * 0.3 }} />
        </>
      )}
      {kind === "note" &&
        [0.6, 0.75, 0.4].map((w, i) => <i key={i} className="absolute left-3.5 h-[5px] rounded-full" style={{ ...ink, top: 14 + i * 14, width: width * w, opacity: 1 - i * 0.2 }} />)}
      {kind === "shot" && (
        <>
          <i className="absolute inset-[10px_10px_30px_10px] rounded-[7px] opacity-55" style={ink} />
          <i className="absolute bottom-3 left-3 h-1.5 rounded-full" style={{ ...ink, width: width * 0.5 }} />
        </>
      )}
      {kind === "video" && (
        <svg viewBox="0 0 20 20" className="absolute top-1/2 left-1/2 size-[26px] -translate-x-1/2 -translate-y-1/2">
          <path d="M6 3.5v13l11-6.5z" style={{ fill: mix(Math.min(s * 1.6, 3.5)) }} />
        </svg>
      )}
    </div>
  );
}

export function HeroFragments() {
  return (
    <>
      {(["left", "right"] as const).map((side) => (
        <div
          key={side}
          aria-hidden
          className={ROOT}
          style={{
            [side]: 0,
            maskImage: `linear-gradient(${side === "left" ? 90 : 270}deg, #000 55%, transparent)`,
            WebkitMaskImage: `linear-gradient(${side === "left" ? 90 : 270}deg, #000 55%, transparent)`,
          }}
        >
          {(side === "left" ? LEFT : RIGHT).map((fragment, i) => (
            <Piece key={i} fragment={fragment} side={side} />
          ))}
        </div>
      ))}
    </>
  );
}
