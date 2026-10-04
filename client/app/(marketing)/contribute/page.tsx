import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";
import { ContributeSection } from "@/components/marketing/landing/contribute-section";

export default function ContributePage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-primary/[0.03] via-background to-background text-foreground font-sans">
      <Navbar />

      <main className="flex-1 pt-20">
        <ContributeSection showDonate />
      </main>

      <MainFooter />
    </div>
  );
}
