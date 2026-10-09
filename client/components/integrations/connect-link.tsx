"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";

/**
 * A "Connect" button that leaves the app for a provider's consent screen.
 *
 * The connect address is on the API and needs a signed-in session, but a page
 * navigation can't renew an expired one the way the app's own requests do. So
 * this makes one ordinary request first, which renews the session if it has
 * lapsed, and only then navigates. Without it, the first click after the
 * session expired (15 minutes) landed on an error and seemed to do nothing.
 */
export function ConnectLink({ href, children, ...props }: { href: string } & Omit<React.ComponentProps<typeof Button>, "onClick" | "render">) {
  const [leaving, setLeaving] = useState(false);

  const go = async () => {
    setLeaving(true);
    // If this fails the session is really gone, and the app's own handling takes over.
    await getCurrentUser().catch(() => {});
    window.location.assign(href);
  };

  return (
    <Button {...props} onClick={go} disabled={leaving || props.disabled}>
      {children}
    </Button>
  );
}
