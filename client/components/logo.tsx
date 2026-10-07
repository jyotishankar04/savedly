import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * The Savedly mark: a tilted blue note with a happy face and a curled
 * corner, with two motion ticks. The same drawing lives in public/logo.svg
 * and (without the ticks, cropped tighter) in app/icon.svg for the favicon;
 * change all three together.
 */
export function LogoMark({ className, ticks = true }: { className?: string; ticks?: boolean }) {
  // Gradient ids must be unique per instance: several marks share a page.
  const id = useId().replace(/:/g, "");
  return (
    <svg
      viewBox={ticks ? "0 0 128 128" : "14 14 100 100"}
      fill="none"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3D7BFF" />
          <stop offset="1" stopColor="#0B3FE3" />
        </linearGradient>
        <linearGradient id={`${id}-f`} x1="50" y1="50" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.55" stopColor="#E6EEFF" />
          <stop offset="1" stopColor="#9DB9FF" />
        </linearGradient>
      </defs>
      <g transform={`translate(${ticks ? "13.5 28" : "24 24"}) rotate(-12 40 40)`}>
        <rect width="80" height="80" rx="20" fill={`url(#${id}-b)`} />
        <path d="M80 40C73 50 60 50 54 57C47 65 50 74 43 80H60A20 20 0 0 0 80 60Z" fill={`url(#${id}-f)`} />
        <path d="M18.5 38A6.5 6.5 0 0 1 31.5 38M44.5 38A6.5 6.5 0 0 1 57.5 38" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
        {ticks && <path d="M88 6L95 -4M92 18L102 11" stroke="#2F6BFF" strokeWidth="8" strokeLinecap="round" />}
      </g>
    </svg>
  );
}

/**
 * Mark + wordmark. The "ly" takes the accent colour and a lighter weight, so
 * "saved" reads first. The mark scales with the text size.
 */
export function Logo({
  className,
  accentClassName = "text-primary",
  mark = true,
}: {
  className?: string;
  accentClassName?: string;
  mark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-[0.4em] font-semibold tracking-[-0.03em] select-none whitespace-nowrap", className)}>
      {mark && <LogoMark className="h-[1.7em] w-[1.7em] -my-[0.35em]" />}
      <span>
        saved
        <span className={cn("font-medium", accentClassName)}>ly</span>
      </span>
    </span>
  );
}
