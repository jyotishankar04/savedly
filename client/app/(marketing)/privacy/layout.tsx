import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — SaveForLatter",
  description: "Read our privacy policy and learn how we protect your personal memory.",
  alternates: { canonical: "/privacy" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
