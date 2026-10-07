import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community — Savedly",
  description: "Join the Savedly community of digital explorers and developers.",
  alternates: { canonical: "/community" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
