"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { guideBySlug } from "@/lib/help-content";

/** Old links looked like /help#search; each guide now has its own page, so forward them. */
export function HelpHashRedirect() {
  const router = useRouter();
  useEffect(() => {
    const id = window.location.hash.replace(/^#/, "");
    if (id && guideBySlug(id)) router.replace(`/help/${id}`);
  }, [router]);
  return null;
}
