"use client";

import React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { SparklesIcon as Sparkles, ArrowLeft01Icon as ArrowLeft } from "@hugeicons/core-free-icons";
import { LogoMark } from "@/components/logo";
import { getProviderLoginUrl } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { SELF_HOSTED } from "@/lib/instance";

const GoogleIcon = () => (
  <svg className="h-4 w-4 mr-2 shrink-0" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
  </svg>
);

const GithubIcon = () => (
  <svg className="h-4 w-4 mr-2 fill-foreground text-foreground shrink-0" viewBox="0 0 24 24">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
  </svg>
);

export default function ForgotPasswordPage() {
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
        <Link href={SELF_HOSTED ? "/auth/login" : "/"} className="flex items-center gap-2 text-foreground relative z-10 hover:opacity-90 transition-opacity w-fit">
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

      {/* Right Panel: Info and OAuth shortcuts */}
      <div className="flex-1 flex flex-col justify-between py-8 px-4 lg:px-12 bg-background">
        
        {/* Back Link */}
        <Link href="/auth/login" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit">
          <HugeiconsIcon icon={ArrowLeft} strokeWidth={2.25} className="h-3.5 w-3.5" /> Back to sign in
        </Link>

        {/* Form Container */}
        <div className="w-full max-w-sm mx-auto space-y-8 my-auto">
          
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">Forgot password?</h2>
            <p className="text-xs text-muted-foreground">
              Here is how you can access your account.
            </p>
          </div>

          {/* Explanation Box */}
          <div className="p-4 rounded-xl border border-border/50 bg-muted/30 space-y-3">
            <div className="flex items-center gap-2 text-primary font-semibold text-xs">
              <HugeiconsIcon icon={Sparkles} strokeWidth={2.25} className="h-3.5 w-3.5 fill-current animate-pulse" />
              <span>Passwordless OAuth Active</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Savedly uses passwordless OAuth login. Since your account is linked directly to your Google or GitHub profile, there are no passwords to reset or recover.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Simply log in using the same social account you registered with.
            </p>
          </div>

          {/* Social Sign In Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => {
                window.location.href = getProviderLoginUrl("google");
              }}
              className="w-full flex items-center justify-center border border-input bg-background hover:bg-muted text-foreground text-sm font-medium py-3 rounded-xl transition-all cursor-pointer"
            >
              <GoogleIcon />
              Continue with Google
            </button>
            <button
              onClick={() => {
                window.location.href = getProviderLoginUrl("github");
              }}
              className="w-full flex items-center justify-center border border-input bg-background hover:bg-muted text-foreground text-sm font-medium py-3 rounded-xl transition-all cursor-pointer"
            >
              <GithubIcon />
              Continue with GitHub
            </button>
          </div>

          {/* Help Links */}
          <div className="text-center text-xs">
            <p className="text-muted-foreground">
              Don&apos;t have an account yet?{" "}
              <Link href="/auth/signup" className="text-primary hover:underline font-semibold">
                Sign up
              </Link>
            </p>
          </div>

        </div>

        {/* Footer Right Links */}
        <div className="flex justify-center gap-6 text-[10px] text-muted-foreground mt-auto">
          {!SELF_HOSTED && <Link href="/" className="hover:text-foreground transition-colors">Home</Link>}
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
        </div>

      </div>

    </div>
  );
}
