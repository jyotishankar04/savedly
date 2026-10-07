import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact — Savedly",
  description: "Get in touch with the Savedly team for support, questions, or feedback.",
  alternates: { canonical: "/contact" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
