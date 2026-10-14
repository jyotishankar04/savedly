import type { Metadata } from "next";
import { CommunityContent } from "@/components/marketing/community/community-content";

export const metadata: Metadata = {
  title: "Community · Savedly",
  description: "Join the Savedly Discord, discuss ideas on GitHub, and follow what ships. Ask questions, share how you use it, and help decide what comes next.",
  alternates: { canonical: "/community" },
};

export default function CommunityPage() {
  return <CommunityContent />;
}
