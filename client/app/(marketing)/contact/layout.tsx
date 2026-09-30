import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact — SaveForLatter",
  description: "Get in touch with the SaveForLatter team for support, questions, or feedback.",
  alternates: { canonical: "/contact" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
