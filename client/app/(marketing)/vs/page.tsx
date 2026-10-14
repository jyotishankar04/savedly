import type { Metadata } from "next";
import { CompareHub } from "@/components/marketing/compare/compare-hub";

export const metadata: Metadata = {
  title: "Savedly compared",
  description: "Savedly side by side with mymind, Raindrop.io, Notion, Readwise Reader, Evernote and more: what each keeps, how you find things again, and who owns the data.",
  alternates: { canonical: "/vs" },
};

export default function CompareHubPage() {
  return <CompareHub />;
}
