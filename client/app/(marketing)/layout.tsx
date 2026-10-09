import Script from "next/script";
import type { Metadata } from "next";
import { SELF_HOSTED } from "@/lib/instance";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// Floating "Buy Me a Coffee" widget — marketing pages only, deliberately not
// the (platfrom)/app or /admin trees: a persistent floating nag is fine for
// a visitor browsing the public site, not for someone signed in trying to
// get work done (see the sidebar upgrade-card removal earlier — same
// reasoning against always-on asks inside the app itself). The explicit
// "Buy me a coffee" button + QR (components/support-project-card.tsx) is
// where support is offered inside the app instead.
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      {!SELF_HOSTED && (
        <Script
          id="bmc-widget"
          strategy="lazyOnload"
          src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js"
          data-name="BMC-Widget"
          data-cfasync="false"
          data-id="devsuvam1"
          data-description="Support me on Buy me a coffee!"
          data-message=""
          data-color="#FF813F"
          data-position="Right"
          data-x_margin="18"
          data-y_margin="18"
        />
      )}
    </>
  );
}
