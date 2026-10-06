"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/auth";

type State = "asking" | "working" | "unsubscribed" | "resubscribed" | "error";

/**
 * Where the "Unsubscribe" link in an announcement email lands. It asks first,
 * so a mail scanner that opens every link can't unsubscribe someone. The link
 * carries a signed token, so this works signed out.
 */
function Unsubscribe() {
  const params = useSearchParams();
  const u = params.get("u");
  const t = params.get("t");
  const [state, setState] = useState<State>("asking");
  const [error, setError] = useState("");

  const send = async (path: "unsubscribe" | "resubscribe") => {
    setState("working");
    try {
      await apiFetch(`/email/${path}`, { method: "POST", body: { u, t } });
      setState(path === "unsubscribe" ? "unsubscribed" : "resubscribed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setState("error");
    }
  };

  if (!u || !t) {
    return (
      <>
        <h1 className="text-2xl font-medium tracking-tight text-foreground">This link isn&apos;t complete</h1>
        <p className="text-sm text-muted-foreground">
          Open the Unsubscribe link from a recent email. If you&apos;re signed in, you can also turn announcements off in{" "}
          <Link href="/app/settings/notifications" className="text-primary hover:underline">
            Settings
          </Link>
          .
        </p>
      </>
    );
  }

  if (state === "unsubscribed") {
    return (
      <>
        <h1 className="text-2xl font-medium tracking-tight text-foreground">You&apos;re unsubscribed</h1>
        <p className="text-sm text-muted-foreground">
          We won&apos;t send you announcement emails. You&apos;ll still get emails about your own account, such as a sharing invitation.
        </p>
        <Button variant="outline" onClick={() => send("resubscribe")}>
          Subscribe again
        </Button>
      </>
    );
  }

  if (state === "resubscribed") {
    return (
      <>
        <h1 className="text-2xl font-medium tracking-tight text-foreground">You&apos;re subscribed again</h1>
        <p className="text-sm text-muted-foreground">You&apos;ll get announcement emails from SaveForLatter.</p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-medium tracking-tight text-foreground">Unsubscribe from announcements?</h1>
      <p className="text-sm text-muted-foreground">
        You&apos;ll stop getting emails about new features and changes. Emails about your own account are not affected.
      </p>
      {state === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button onClick={() => send("unsubscribe")} disabled={state === "working"}>
        {state === "working" ? "Unsubscribing…" : "Unsubscribe"}
      </Button>
    </>
  );
}

export default function UnsubscribePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-start justify-center gap-4 px-6 pt-32 pb-20">
        <Suspense fallback={null}>
          <Unsubscribe />
        </Suspense>
      </main>
      <MainFooter />
    </div>
  );
}
