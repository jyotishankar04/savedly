"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import { Mail01Icon as Mail, MessageSquareIcon as MessageSquare, MapPinIcon as MapPin, BugIcon as Bug, Calendar01Icon as Calendar } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BOOKING_URL } from "@/lib/booking";

// Adapted from a pasted "Contact5" reference. react-icons' IconType swapped
// for this repo's HugeiconsIcon convention; @/components/base-ui/badge
// doesn't exist here (real path is @/components/ui/badge). Content is real
// facts the previous /contact page already had — support@saveforlatter.com,
// Slack for Pro subscribers, Bengaluru — plus a real Cal.com link, not the
// phone-number fourth card the reference assumed (no phone number exists
// anywhere in this codebase).
interface ContactMethod {
  icon: IconSvgElement;
  title: string;
  description: string;
  details: string;
  href?: string;
}

const CONTACT_METHODS: ContactMethod[] = [
  {
    icon: Mail,
    title: "Email us",
    description: "For anything — billing, bugs, feature requests.",
    details: "support@saveforlatter.com",
  },
  {
    icon: Calendar,
    title: "Book a call",
    description: "30 minutes, straight onto the calendar.",
    details: "Pick a time →",
    href: BOOKING_URL,
  },
  {
    icon: MessageSquare,
    title: "Priority Slack",
    description: "A direct channel, included with Pro.",
    details: "Included with Pro",
  },
  {
    icon: MapPin,
    title: "Based in",
    description: "Where the team actually works from.",
    details: "Bengaluru, India",
  },
];

function MethodCard({ method, idx }: { method: ContactMethod; idx: number }) {
  const content = (
    <>
      <div className="mb-5 rounded-xl border border-primary/30 bg-primary/10 p-3 text-primary">
        <HugeiconsIcon icon={method.icon} strokeWidth={2.25} className="h-6 w-6 md:h-7 md:w-7" />
      </div>
      <h3 className="mb-3 text-lg font-semibold text-foreground md:text-xl">{method.title}</h3>
      <p className="mb-4 text-sm leading-relaxed text-muted-foreground md:text-base">{method.description}</p>
      <p className={cn("mt-auto text-base font-medium md:text-lg", method.href ? "text-primary" : "text-foreground")}>{method.details}</p>
    </>
  );

  const className = cn(
    "flex flex-col items-center px-4 py-8 text-center md:px-8 md:py-10",
    idx % 2 === 0 ? "bg-background" : "bg-muted/50",
    method.href && "transition-colors hover:bg-primary/5"
  );

  if (method.href) {
    return (
      <a href={method.href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    );
  }
  return <div className={className}>{content}</div>;
}

export function ContactMethodsBand() {
  return (
    <section className="w-full bg-background py-12">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="mb-12 flex flex-col items-center space-y-4 text-center">
          <Badge className="rounded-full px-4 py-1.5 text-sm font-medium">Other ways to reach us</Badge>
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">More than one way to say hi.</h2>
        </div>

        <div className="grid grid-cols-1 divide-y divide-border border-t border-b border-border sm:grid-cols-2 md:grid-cols-4 md:divide-x md:divide-y-0">
          {CONTACT_METHODS.map((method, idx) => (
            <MethodCard key={method.title} method={method} idx={idx} />
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center gap-2 text-center">
          <p className="mx-auto max-w-xl text-sm text-muted-foreground md:text-base">We read every message — usually within a day.</p>
          <Link href="/report" className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
            <HugeiconsIcon icon={Bug} strokeWidth={2.25} className="h-4 w-4" />
            Found a bug or missing a feature? Report it directly →
          </Link>
        </div>
      </div>
    </section>
  );
}

export default ContactMethodsBand;
