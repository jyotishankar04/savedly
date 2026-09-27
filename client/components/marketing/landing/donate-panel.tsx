import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import { Coffee01Icon as Coffee, ArrowUpRight01Icon as ArrowUpRight } from "@hugeicons/core-free-icons";
import { BMC_QR_IMAGE, BMC_URL } from "@/lib/support";

/**
 * The money ask, shown on /contribute only (the homepage deliberately
 * doesn't carry it). Buy Me a Coffee handles payment; nothing here touches
 * money. The QR sits on white in both themes so phones can scan it.
 */
export function DonatePanel() {
  return (
    <div className="mt-20 grid items-center gap-10 rounded-3xl bg-foreground/[0.035] p-7 ring-1 ring-foreground/8 sm:p-10 lg:grid-cols-[1.3fr_0.7fr] lg:gap-16 lg:p-12">
      <div>
        <h3 className="text-2xl font-semibold tracking-[-0.02em] text-foreground sm:text-3xl">Help keep the servers running</h3>
        <p className="mt-3 max-w-lg leading-relaxed text-muted-foreground">
          You bring your own AI key, so the project never pays for that. Hosting the database, storage and email still costs real money every
          month. If SaveForLatter is useful to you, a small contribution helps keep it free for everyone.
        </p>
        <a
          href={BMC_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-7 inline-flex h-11 items-center gap-2 rounded-full bg-[#FFDD00] px-6 text-[15px] font-medium text-black transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFDD00] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <HugeiconsIcon icon={Coffee} strokeWidth={2} className="h-4 w-4" />
          Buy me a coffee
          <HugeiconsIcon icon={ArrowUpRight} strokeWidth={2} className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
        <p className="mt-3 text-sm text-muted-foreground">Opens Buy Me a Coffee in a new tab.</p>
      </div>

      <a
        href={BMC_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mx-auto flex w-full max-w-[220px] flex-col items-center gap-3 rounded-2xl bg-white p-4 shadow-[0_20px_50px_-24px_rgb(0_0_0/0.4)] ring-1 ring-black/5 lg:justify-self-end"
      >
        <Image src={BMC_QR_IMAGE} alt="QR code for SaveForLatter's Buy Me a Coffee page" width={188} height={188} className="h-auto w-full" />
        <span className="text-center text-xs font-medium text-neutral-600">Scan to support from your phone</span>
      </a>
    </div>
  );
}
