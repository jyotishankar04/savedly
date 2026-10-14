import type { Metadata } from "next";
import { ContactContent } from "@/components/marketing/contact/contact-content";

export const metadata: Metadata = {
  title: "Contact · Savedly",
  description: "Write to the people who make Savedly: a question, a bug, billing, or an idea. Every message is read by a person.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return <ContactContent />;
}
