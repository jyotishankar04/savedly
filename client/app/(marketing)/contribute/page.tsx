import type { Metadata } from "next";
import { ContributeContent } from "@/components/marketing/contribute/contribute-content";

export const metadata: Metadata = {
  title: "Contribute · Savedly",
  description: "Savedly is open source under AGPL-3.0. Report a bug, fix something, improve the docs, or help keep the servers running.",
  alternates: { canonical: "/contribute" },
};

export default function ContributePage() {
  return <ContributeContent />;
}
