import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — SaveForLatter",
  description: "SaveForLatter is built by digital explorers who believe the bookmarks bar is broken. We are designing a seamless second brain.",
  alternates: { canonical: "/about" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
