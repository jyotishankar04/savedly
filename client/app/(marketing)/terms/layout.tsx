import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Savedly",
  description: "Read the terms of service for using Savedly.",
  alternates: { canonical: "/terms" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
