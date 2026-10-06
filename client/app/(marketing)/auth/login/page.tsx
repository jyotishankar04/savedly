"use client";

import React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon as ArrowLeft } from "@hugeicons/core-free-icons";
import { LogoMark } from "@/components/logo";
import { AuthForm } from "@/components/auth/auth-form";
import { Logo } from "@/components/logo";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans p-4 lg:p-6 gap-6">
      
      {/* Left Panel: Glowing Brand Visual (Hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 p-12 flex-col justify-between rounded-3xl relative overflow-hidden bg-card border border-border/50">
        
        {/* Soft radial blue-indigo gradient overlay */}
        <div 
          className="absolute inset-0 opacity-60 dark:opacity-40 scale-110 pointer-events-none"
          style={{
            background: "radial-gradient(circle at 60% 60%, rgba(20,71,230,0.3) 0%, rgba(139,92,246,0.1) 50%, rgba(255,255,255,0) 100%)",
            filter: "blur(60px)"
          }}
        />

        {/* Brand Logo Header */}
        <Link href="/" className="flex items-center gap-2 text-foreground relative z-10 hover:opacity-90 transition-opacity w-fit">
          <Logo className="text-[17px] text-foreground" />
        </Link>

        {/* Brand Copy */}
        <div className="relative z-10 max-w-md space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-primary bg-primary/10 border border-primary/15">
            <LogoMark ticks={false} className="h-3.5 w-3.5" />
            <span>AI Powered Memory</span>
          </span>
          <h1 className="text-4xl font-semibold tracking-tight leading-tight text-card-foreground">
            Save everything you discover, search by what you remember.
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Links, notes, screenshots and PDFs in one place, organized for you and searchable by meaning.
          </p>
        </div>

        {/* Card Footer copy */}
        <p className="text-[11px] text-muted-foreground relative z-10">
          &copy; 2026 Savedly. All rights reserved.
        </p>

      </div>

      {/* Right Panel: Sign In Form */}
      <div className="flex-1 flex flex-col justify-between py-8 px-4 lg:px-12 bg-background">
        
        {/* Back Link */}
        <Link href="/" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit">
          <HugeiconsIcon icon={ArrowLeft} strokeWidth={2.25} className="h-3.5 w-3.5" /> Back to home
        </Link>

        {/* Form Container */}
        <div className="w-full max-w-sm mx-auto my-auto">
          <AuthForm mode="login" />
        </div>

        {/* Footer Right Links */}
        <div className="flex justify-center gap-6 text-[10px] text-muted-foreground mt-auto">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
        </div>

      </div>

    </div>
  );
}
