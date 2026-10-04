"use client";

import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";
import { ContactFormHero } from "@/components/marketing/landing/contact-form-hero";
import { ContactMethodsBand } from "@/components/marketing/landing/contact-methods-band";

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-primary/[0.03] via-background to-background font-sans text-foreground">
      <Navbar />

      <main className="flex-1 pt-32 pb-8">
        <ContactFormHero />
        <ContactMethodsBand />
      </main>

      <MainFooter />
    </div>
  );
}
