import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy — Savedly",
  description: "Learn how Savedly uses cookies to provide a secure and seamless experience.",
  alternates: { canonical: "/cookies" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
