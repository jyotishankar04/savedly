"use client";

import React from "react";
import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";
import { HugeiconsIcon } from "@hugeicons/react";
import { SparklesIcon as Sparkles, ArrowLeft01Icon as ArrowLeft } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function BlogPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-primary/[0.03] via-background to-background text-foreground font-sans">
      <Navbar />
      
      <main className="flex-1 pt-32 pb-20 flex flex-col justify-center items-center text-center px-6">
        
        {/* Glowing badge */}
        <div className="relative w-16 h-16 flex items-center justify-center mb-6">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
          <div className="w-14 h-14 rounded-2xl border border-primary/30 flex items-center justify-center bg-card shadow-md">
            <HugeiconsIcon icon={Sparkles} strokeWidth={2.25} className="h-7 w-7 text-primary" />
          </div>
        </div>

        {/* Content text */}
        <div className="space-y-4 max-w-md mx-auto">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
            The Savedly Blog
          </span>
          <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-foreground leading-[1.15] pt-2">
            Adding soon.
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm leading-relaxed">
            We are preparing deep dives on personal knowledge graphs, local-first vector search, semantic RAG setups, and productivity frameworks. 
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-8">
          <Button
            render={<Link href="/" />}
            nativeButton={false}
            className="h-10 px-6 rounded-full font-medium shadow-xs flex items-center gap-1.5"
            variant="outline"
          >
            <HugeiconsIcon icon={ArrowLeft} strokeWidth={2.25} className="h-4 w-4" /> Back to home
          </Button>
        </div>

      </main>

      <MainFooter />
    </div>
  );
}
