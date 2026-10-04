import type { Metadata } from "next";
import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";
import { PricingPlans } from "@/components/marketing/pricing-plans";

export const metadata: Metadata = {
  title: "Pricing — SaveForLatter",
  description:
    "Self-host SaveForLatter for free, or use the hosted version: a Free plan with AI we supply, or Lite and Pro for more room, more AI and more features.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans">
      <Navbar />
      <main className="flex-1 pt-20">
        <PricingPlans />
      </main>
      <MainFooter />
    </div>
  );
}
