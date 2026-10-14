import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Report a bug or an idea · Savedly",
  description: "Tell the people who build Savedly what broke or what's missing. Every report is read, and you get a reply if you leave an email.",
  alternates: { canonical: "/report" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
