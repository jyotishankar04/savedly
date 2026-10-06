import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { HeartAddIcon as Heart } from "@hugeicons/core-free-icons";
import { BMC_QR_IMAGE, BMC_URL } from "@/lib/support";
import Image from "next/image";

export function SupportProjectCard({ className }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-border/60 bg-card p-5 space-y-4 ${className ?? ""}`}>
      <div className="flex items-start gap-2.5">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <HugeiconsIcon icon={Heart} strokeWidth={2.25} className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-foreground">Help keep the servers running</h4>
          <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
            Savedly is open source, and the Free plan stays free. Hosting the database, storage, email and the AI we supply costs real money every month. If it&apos;s useful to you, a small contribution helps keep the lights on.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <a href={BMC_URL} target="_blank" rel="noopener noreferrer" className="shrink-0">
          <Image src={BMC_QR_IMAGE} alt="Buy Me a Coffee QR code" width={88} height={88} className="rounded-lg border border-border/50" />
        </a>
        <div className="min-w-0 space-y-2">
          <a
            href={BMC_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-bold"
            style={{ backgroundColor: "#FFDD00", color: "#000000" }}
          >
            <span aria-hidden>☕</span> Buy me a coffee
          </a>
          <p className="text-[9.5px] text-muted-foreground">Scan the QR or tap the button — both go to the same page.</p>
        </div>
      </div>
    </div>
  );
}
