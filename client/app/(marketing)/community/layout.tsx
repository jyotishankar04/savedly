import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community — SaveForLatter",
  description: "Join the SaveForLatter community of digital explorers and developers.",
  alternates: { canonical: "/community" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
