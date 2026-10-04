"use client";

import React from "react";
import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";
import { HugeiconsIcon } from "@hugeicons/react";
import { Brain01Icon as Brain, SparklesIcon as Sparkles, Shield01Icon as Shield } from "@hugeicons/core-free-icons";

const values = [
  { title: "User Ownership", desc: "Your data belongs to you. You can export or delete your entire memory graph at any point.", icon: Shield },
  { title: "Local-First Focus", desc: "We prioritize local-first computing and secure sandboxes so your records remain private.", icon: Brain },
  { title: "Minimal Interactions", desc: "We believe in folderless design. SaveForLatter operates in the background, working when you search.", icon: Sparkles },
];

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-primary/[0.03] via-background to-background text-foreground font-sans">
      <Navbar />
      
      <main className="flex-1 pt-32 pb-20">
        
        {/* Header */}
        <div className="max-w-6xl mx-auto px-6 text-center space-y-4 mb-20">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
            Our Mission
          </span>
          <h1 className="text-4xl md:text-6xl font-medium tracking-tight text-foreground leading-[1.15]">
            Save it. Find it. <br className="hidden sm:block" /> Never lose a good idea.
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            SaveForLatter is built by digital explorers who believe the bookmarks bar is broken. We are designing a seamless second brain.
          </p>
        </div>

        {/* Story Section */}
        <div className="max-w-3xl mx-auto px-6 mb-20 space-y-6 text-sm text-foreground/80 leading-relaxed">
          <p>
            Every day, we browse hundreds of websites, watch dozens of video tutorials, bookmark repositories, capture screenshots, and type quick ideas. But the moment we hit &ldquo;save&rdquo;, that discovery gets buried.
          </p>
          <p>
            Traditional bookmark managers force us to build manual hierarchies of folders and tag collections. It&apos;s a chore, so we stop doing it. In the end, we lose the very ideas we set out to save.
          </p>
          <p>
            We built SaveForLatter to change this. By using semantic vector embeddings and LLM reasoning, SaveForLatter reads the content of what you save—automatically grouping, indexing, and preparing it for retrieval in natural language queries.
          </p>
        </div>

        {/* Values Title */}
        <div className="max-w-6xl mx-auto px-6 mb-10 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Our Core Beliefs</h2>
        </div>

        {/* Values Grid (Double Bordered Cards!) */}
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {values.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={idx}
                className="rounded-2xl border border-border/45 bg-muted/75 p-1 shadow-xs dark:border-border/65"
              >
                <div className="p-6 rounded-xl border border-border/75 bg-card flex flex-col justify-between h-full">
                  <div>
                    <div className="p-2 rounded-xl bg-primary/10 text-primary w-fit mb-4">
                      <HugeiconsIcon icon={Icon} strokeWidth={2.25} className="h-4.5 w-4.5" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </main>

      <MainFooter />
    </div>
  );
}
