import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { competitors } from "@/lib/data/comparisons";
import { CompareDetail } from "@/components/marketing/compare/compare-detail";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return competitors.map((comp) => ({ slug: comp.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const competitor = competitors.find((c) => c.slug === slug);
  if (!competitor) return {};

  return {
    title: `Savedly vs ${competitor.name}: an open-source ${competitor.name} alternative`,
    description: `Savedly and ${competitor.name} side by side: what each keeps, how you find things again, sharing, privacy and price, and when ${competitor.name} is the better fit.`,
    alternates: { canonical: `/vs/${slug}` },
  };
}

export default async function ComparisonPage({ params }: Props) {
  const { slug } = await params;
  if (!competitors.some((c) => c.slug === slug)) notFound();
  return <CompareDetail slug={slug} />;
}
