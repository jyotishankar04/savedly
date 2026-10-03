import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon as ArrowRight } from "@hugeicons/core-free-icons";

export interface GuideAction {
  label: string;
  href: string;
}

/** The button row at the top of a guide: the first action is the primary one, the rest are outlined. */
export function GuideActions({ actions }: { actions: GuideAction[] }) {
  return (
    <div className="not-prose my-6 flex flex-wrap gap-2">
      {actions.map((action, i) => (
        <Link
          key={action.href}
          href={action.href}
          className={
            i === 0
              ? "inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              : "inline-flex h-10 items-center rounded-full border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          }
        >
          {action.label}
          {i === 0 && <HugeiconsIcon icon={ArrowRight} strokeWidth={2.25} className="h-4 w-4" />}
        </Link>
      ))}
    </div>
  );
}
