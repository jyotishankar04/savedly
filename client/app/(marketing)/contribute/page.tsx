import type { Metadata } from "next";
import { ContributeContent } from "@/components/marketing/contribute/contribute-content";
import { getContributors } from "@/lib/github-contributors";

export const metadata: Metadata = {
  title: "Contribute · Savedly",
  description: "Savedly is open source under AGPL-3.0. Report a bug, fix something, improve the docs, or help keep the servers running.",
  alternates: { canonical: "/contribute" },
};

// The contributors list is fetched on the server and refreshed every six hours.
export default async function ContributePage() {
  const contributors = await getContributors();
  return <ContributeContent contributors={contributors} />;
}
