import type { Metadata } from "next";

// The page itself is a client component, so its title and address for search
// engines are set here.
export const metadata: Metadata = {
  title: "Choosing your AI models · Help · Savedly",
  description: "For self-hosted Savedly: pick what matters most and get a suggested model for each part of the app, with live prices.",
  alternates: { canonical: "/help/model-selection" },
};

export default function ModelSelectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
