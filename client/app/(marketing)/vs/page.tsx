import Link from "next/link";
import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";
import { competitors } from "@/lib/data/comparisons";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare SaveForLatter Alternatives",
  description: "See how SaveForLatter compares to traditional bookmark managers, note-taking apps, and read-it-later tools.",
  alternates: { canonical: "/vs" },
};

export default function CompareHubPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans">
      <Navbar />
      <main className="flex-1 pt-32 pb-20 max-w-6xl mx-auto px-6 w-full">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
            Comparisons
          </span>
          <h1 className="mt-6 text-4xl md:text-5xl font-medium tracking-tight">Compare SaveForLatter</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            See how our AI-powered second brain stacks up against the alternatives.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {competitors.map((c) => (
            <Link 
              key={c.slug} 
              href={`/vs/${c.slug}`} 
              className="group block p-6 border rounded-2xl bg-card hover:bg-muted/50 transition-colors shadow-sm"
            >
              <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                SaveForLatter vs {c.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                Comparing our AI second brain against their {c.type.toLowerCase()}.
              </p>
            </Link>
          ))}
        </div>
      </main>
      <MainFooter />
    </div>
  );
}
