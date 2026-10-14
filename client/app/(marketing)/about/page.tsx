import type { Metadata } from "next";
import { AboutContent } from "@/components/marketing/about/about-content";

export const metadata: Metadata = {
  title: "About · Savedly",
  description: "Why Savedly exists, what it holds itself to, and how to help shape it. Open source, made in Bhubaneswar.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return <AboutContent />;
}
