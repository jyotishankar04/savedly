import { HelpSidebar } from "@/components/help/help-sidebar";

// The sidebar lives here, above the [slug] segment, so it stays mounted while
// you move between guides. Rendering it inside each page remounts it on every
// click, which resets its scroll position to the top.
export default function GuidesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-6xl mx-auto px-6 flex flex-col lg:flex-row gap-10 lg:gap-16">
      <HelpSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
