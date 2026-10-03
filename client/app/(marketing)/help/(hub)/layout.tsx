import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";

// Shared chrome for every Help Center page (hub, guides, tools). Each page
// composes its own body so a wide tool doesn't have to share a column with
// the guide sidebar.
export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans">
      <Navbar />
      <main className="flex-1 pt-32 pb-24">{children}</main>
      <MainFooter />
    </div>
  );
}
