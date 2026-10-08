"use client";

import React from "react";
import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";
import Link from "next/link";
import { SELF_HOSTED } from "@/lib/instance";
import { HostedPolicyNotice } from "@/components/self-hosted/plain-chrome";

export default function CookiesPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-primary/[0.03] via-background to-background text-foreground font-sans">
      <Navbar />

      <main className="flex-1 pt-32 pb-20 max-w-4xl mx-auto px-6">

        {SELF_HOSTED && <HostedPolicyNotice />}

        {/* Header */}
        <div className="text-center space-y-4 mb-16">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
            Legal Policy
          </span>
          <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-foreground leading-[1.15]">
            Cookie Policy
          </h1>
          <p className="text-muted-foreground text-xs font-mono">
            Last Updated: September 2026
          </p>
        </div>

        {/* Content text */}
        <div className="prose prose-zinc dark:prose-invert max-w-none text-sm md:text-base leading-relaxed text-foreground/80 space-y-8">

          <section className="space-y-4">
            <p>
              This Cookie Policy explains how Savedly (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) uses cookies and similar tracking technologies when you visit our website or use our application.
              By using Savedly, you consent to the use of cookies as described in this policy.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">1. What are cookies?</h2>
            <p>
              Cookies are small text files that are placed on your computer or mobile device when you visit a website.
              They are widely used to make websites work, improve efficiency, and provide crucial functional information to the owners of the site.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">2. How we use cookies</h2>
            <p>We use cookies primarily for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Essential Cookies:</strong> These are strictly necessary to provide you with the Savedly service. We use these to authenticate your session, keep you logged in, and secure your vault against CSRF attacks.
                Without these cookies, the core functionality of our application cannot be provided.
              </li>
              <li>
                <strong>Preference Cookies:</strong> These allow us to remember choices you make (such as your preferred theme - light or dark mode) to provide a more personalized experience.
              </li>
              <li>
                <strong>Analytics Cookies:</strong> We may use privacy-first analytics tools to help us understand how our marketing pages are being used. These cookies collect information in an aggregated, anonymous format.
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">3. Third-party cookies</h2>
            <p>
              Because Savedly integrates with third-party authentication providers (such as Google or GitHub OAuth), those providers may set their own cookies when you authenticate.
              We do not control the cookies set by these third-party services. Please refer to their respective privacy policies for more information.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">4. Managing cookies</h2>
            <p>
              Most web browsers allow you to control cookies through their settings preferences. However, if you limit the ability of websites to set essential cookies,
              you may worsen your overall user experience and lose access to your authenticated dashboard.
            </p>
            <p>
              To find out more about cookies, including how to see what cookies have been set and how to manage and delete them, visit <a href="https://www.allaboutcookies.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">allaboutcookies.org</a>.
            </p>
          </section>

          <section className="space-y-4 pt-8 border-t border-border">
            <h2 className="text-xl font-bold text-foreground">5. Contact us</h2>
            <p>
              If you have any questions about our use of cookies, please <Link href="/contact" className="text-primary hover:underline">contact us</Link>.
              For broader information regarding how we handle your personal data, please review our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
            </p>
          </section>

        </div>
      </main>

      <MainFooter />
    </div>
  );
}
