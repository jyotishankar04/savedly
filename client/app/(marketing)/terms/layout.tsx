import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — SaveForLatter",
  description: "Read the terms of service for using SaveForLatter.",
  alternates: { canonical: "/terms" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
