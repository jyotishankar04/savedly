"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { LockPasswordIcon as Lock } from "@hugeicons/core-free-icons";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { MEMORY_TYPE_ICONS } from "@/lib/memory-icons";
import { cn } from "@/lib/utils";

// Extracted out of vault-section.tsx so the same live demo card can sit in
// a compact visual slot elsewhere (the alternating features section) too.
//
// Unlike almost every other interactive piece on this site, this one needs
// no backend at all — it reuses the exact two browser events the real
// vault page (app/(platfrom)/app/vault/page.tsx) listens for: `blur`/
// `focus` for the instant visual dim, and `visibilitychange` for the real
// lock. A visitor who actually alt-tabs or switches tabs here sees the
// real mechanism, not a script pretending to. The one thing that's fake:
// the PIN entry below always "succeeds" after 4 digits — there's no server
// round trip on a marketing page, but the interaction (enter your PIN to
// come back in) is the same shape as the real unlock flow.
const DEMO_ITEMS: { type: keyof typeof MEMORY_TYPE_ICONS; widthClass: string }[] = [
  { type: "note", widthClass: "w-32" },
  { type: "document", widthClass: "w-40" },
  { type: "image", widthClass: "w-24" },
];

export function VaultDemoCard({ className }: { className?: string }) {
  // Visual-only dim: mirrors the real page's window blur/focus listeners.
  const [dimmed, setDimmed] = useState(false);
  // Real lock: mirrors the real page's visibilitychange listener — tab
  // switch or minimize revokes access outright, not just a blur.
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState("");

  useEffect(() => {
    const dim = () => setDimmed(true);
    const undim = () => setDimmed(false);
    window.addEventListener("blur", dim);
    window.addEventListener("focus", undim);
    return () => {
      window.removeEventListener("blur", dim);
      window.removeEventListener("focus", undim);
    };
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) setLocked(true);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  function handlePinComplete(value: string) {
    setPin(value);
    setLocked(false);
    setPin("");
  }

  return (
    <div className={cn("w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-sm", className)}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Lock} strokeWidth={2.25} className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Vault</span>
        </div>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
            locked
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-primary/30 bg-primary/10 text-primary"
          )}
        >
          {locked ? "Locked" : "Unlocked"}
        </span>
      </div>

      <div className="relative min-h-[168px] p-4">
        <div
          className={cn(
            "flex flex-col gap-3 transition-[filter,opacity] duration-200",
            dimmed && !locked && "opacity-40 blur-[3px]",
            locked && "pointer-events-none opacity-0"
          )}
        >
          {DEMO_ITEMS.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <HugeiconsIcon icon={MEMORY_TYPE_ICONS[item.type]} strokeWidth={2.25} className="h-4 w-4" />
              </span>
              <span className={cn("h-3 rounded-full bg-muted", item.widthClass)} />
            </div>
          ))}
        </div>

        {locked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card px-4">
            <HugeiconsIcon icon={Lock} strokeWidth={2.25} className="h-5 w-5 text-muted-foreground" />
            <p className="text-center text-xs text-muted-foreground">Enter your PIN to come back in</p>
            <InputOTP maxLength={4} value={pin} onChange={setPin} onComplete={handlePinComplete}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
              </InputOTPGroup>
            </InputOTP>
          </div>
        )}
      </div>

      <p className="border-t border-border px-4 py-2.5 text-center text-[11px] text-muted-foreground">
        Try switching tabs, then come back.
      </p>
    </div>
  );
}

export default VaultDemoCard;
