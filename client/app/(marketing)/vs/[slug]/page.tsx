import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { competitors, ourFeatures } from "@/lib/data/comparisons";
import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkBadge01Icon as Check, Cancel01Icon as Cross, Rocket01Icon as Rocket } from "@hugeicons/core-free-icons";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return competitors.map((comp) => ({ slug: comp.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const competitor = competitors.find((c) => c.slug === slug);
  if (!competitor) return {};

  return {
    title: `SaveForLatter vs ${competitor.name} — The Best ${competitor.name} Alternative`,
    description: `Looking for a ${competitor.name} alternative? See why SaveForLatter&aposs AI-driven semantic search makes it the ultimate ${competitor.type.toLowerCase()}.`,
    alternates: { canonical: `/vs/${slug}` },
  };
}

function StatusText({ text, isUs = false }: { text: string; isUs?: boolean }) {
  const isNegative = text.startsWith("No") || text.includes("Proprietary") || text.includes("Limited");
  const isSoon = text.includes("Soon");
  const isPositive = text.startsWith("Yes") || text === "Free" || text.includes("Freemium") || text.includes("Free (Self-Host)");

  if (isSoon) {
    return <><HugeiconsIcon icon={Rocket} className="inline mr-2 text-primary"/> <span className={isUs ? "text-foreground" : ""}>{text}</span></>;
  }
  if (isNegative) {
    return <><HugeiconsIcon icon={Cross} className="inline mr-2 text-destructive"/> {text}</>;
  }
  if (isPositive) {
    return <><HugeiconsIcon icon={Check} className="inline mr-2 text-emerald-500"/> <span className={isUs ? "text-foreground" : ""}>{text}</span></>;
  }
  return <span className={isUs ? "text-foreground" : ""}>{text}</span>;
}

export default async function ComparisonPage({ params }: Props) {
  const { slug } = await params;
  const competitor = competitors.find((c) => c.slug === slug);
  if (!competitor) notFound();

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans">
      <Navbar />
      <main className="flex-1 pt-32 pb-20 max-w-5xl mx-auto px-6 w-full">

        {/* Header Section */}
        <div className="space-y-4 mb-16">
          <div className="text-sm text-muted-foreground">Home / Comparisons / vs {competitor.name}</div>
          <h1 className="text-4xl md:text-5xl font-medium tracking-tight">SaveForLatter vs {competitor.name}</h1>
          <p className="text-lg text-muted-foreground max-w-3xl leading-relaxed">
            {competitor.name} is built as a {competitor.type.toLowerCase()} focusing on {competitor.coreIdea.toLowerCase()}.
            SaveForLatter is an open-source AI second brain where you save anything and find it via hybrid search. Here&aposs how they compare.
          </p>
        </div>

        {/* Feature Comparison Table */}
        <div className="border rounded-2xl overflow-hidden bg-card mb-16 shadow-sm">
          <table className="w-full text-left border-collapse text-sm md:text-base">
            <thead>
              <tr className="bg-muted/30 border-b">
                <th className="p-5 font-semibold">Feature</th>
                <th className="p-5 font-semibold text-primary border-l w-[35%]">SaveForLatter</th>
                <th className="p-5 font-semibold text-muted-foreground border-l w-[35%]">{competitor.name}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {/* Category 1: Core Capabilities */}
              <tr className="bg-muted/10"><td colSpan={3} className="p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Core Capabilities</td></tr>
              <tr>
                <td className="p-5 font-medium">Core Idea</td>
                <td className="p-5 border-l text-foreground">{ourFeatures.coreIdea}</td>
                <td className="p-5 text-muted-foreground border-l">{competitor.coreIdea}</td>
              </tr>
              <tr>
                <td className="p-5 font-medium">What they save</td>
                <td className="p-5 border-l text-foreground">{ourFeatures.whatTheySave}</td>
                <td className="p-5 text-muted-foreground border-l">{competitor.whatTheySave}</td>
              </tr>
              <tr>
                <td className="p-5 font-medium">Auto-organization</td>
                <td className="p-5 border-l text-muted-foreground"><StatusText text={ourFeatures.hasAutoOrg} isUs /></td>
                <td className="p-5 text-muted-foreground border-l"><StatusText text={competitor.hasAutoOrg} /></td>
              </tr>
              <tr>
                <td className="p-5 font-medium">AI / Semantic Search</td>
                <td className="p-5 border-l text-muted-foreground"><StatusText text={ourFeatures.hasSemanticSearch} isUs /></td>
                <td className="p-5 text-muted-foreground border-l"><StatusText text={competitor.hasSemanticSearch} /></td>
              </tr>
              <tr>
                <td className="p-5 font-medium">WhatsApp / Chat Capture</td>
                <td className="p-5 border-l text-muted-foreground"><StatusText text={ourFeatures.hasChatCapture} isUs /></td>
                <td className="p-5 text-muted-foreground border-l"><StatusText text={competitor.hasChatCapture} /></td>
              </tr>

              {/* Category 2: Advanced App Features */}
              <tr className="bg-muted/10"><td colSpan={3} className="p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">App Features</td></tr>
              <tr>
                <td className="p-5 font-medium">Secure Vault</td>
                <td className="p-5 border-l text-muted-foreground"><StatusText text={ourFeatures.hasVault} isUs /></td>
                <td className="p-5 text-muted-foreground border-l"><StatusText text={competitor.hasVault} /></td>
              </tr>
              <tr>
                <td className="p-5 font-medium">Public Sharing</td>
                <td className="p-5 border-l text-muted-foreground"><StatusText text={ourFeatures.hasSharing} isUs /></td>
                <td className="p-5 text-muted-foreground border-l"><StatusText text={competitor.hasSharing} /></td>
              </tr>
              <tr>
                <td className="p-5 font-medium">Knowledge Graph View</td>
                <td className="p-5 border-l text-muted-foreground"><StatusText text={ourFeatures.hasGraphView} isUs /></td>
                <td className="p-5 text-muted-foreground border-l"><StatusText text={competitor.hasGraphView} /></td>
              </tr>

              {/* Category 3: Platform & Privacy */}
              <tr className="bg-muted/10"><td colSpan={3} className="p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Platform & Privacy</td></tr>
              <tr>
                <td className="p-5 font-medium">Open Source</td>
                <td className="p-5 border-l text-muted-foreground"><StatusText text={ourFeatures.isOpenSource} isUs /></td>
                <td className="p-5 text-muted-foreground border-l"><StatusText text={competitor.isOpenSource} /></td>
              </tr>
              <tr>
                <td className="p-5 font-medium">Self-Hostable</td>
                <td className="p-5 border-l text-muted-foreground"><StatusText text={ourFeatures.isSelfHostable} isUs /></td>
                <td className="p-5 text-muted-foreground border-l"><StatusText text={competitor.isSelfHostable} /></td>
              </tr>
              <tr>
                <td className="p-5 font-medium">Pricing Model</td>
                <td className="p-5 border-l text-muted-foreground"><StatusText text={ourFeatures.pricingModel} isUs /></td>
                <td className="p-5 text-muted-foreground border-l"><StatusText text={competitor.pricingModel} /></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Pick Us vs Pick Them */}
        <div className="grid md:grid-cols-2 gap-12 mb-16">
          <div>
            <h3 className="text-xl font-semibold mb-6">Pick SaveForLatter if</h3>
            <ul className="space-y-4">
              {competitor.pickUsIf.map((item, i) => (
                <li key={i} className="flex gap-3 text-muted-foreground"><span className="text-primary">•</span> {item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-6">Pick {competitor.name} if</h3>
            <ul className="space-y-4">
              {competitor.pickThemIf.map((item, i) => (
                <li key={i} className="flex gap-3 text-muted-foreground"><span className="text-foreground/40">•</span> {item}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Where We Excel vs Where They Excel */}
        <div className="grid md:grid-cols-2 gap-12 mb-16 pt-12 border-t">
          <div>
            <h3 className="text-xl font-semibold mb-4">Why Choose SaveForLatter Over {competitor.name}</h3>
            <p className="text-muted-foreground leading-relaxed">{competitor.whereWeExcel}</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-4">Where {competitor.name} Excels</h3>
            <p className="text-muted-foreground leading-relaxed">{competitor.whereTheyExcel}</p>
          </div>
        </div>

        {/* Roadmap Box */}
        <div className="mt-16 bg-primary/5 border border-primary/20 rounded-2xl p-8 md:p-12 text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <HugeiconsIcon icon={Rocket} className="h-6 w-6 text-primary" strokeWidth={2}/>
          </div>
          <h3 className="text-2xl font-semibold mb-4 text-foreground">We&aposre just getting started</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8">
            While {competitor.name} has been around longer, SaveForLatter is shipping rapidly. We are actively working on
            native iOS/Android apps, WhatsApp capture bots, deep browser integrations, and fully local LLM support.
          </p>
          <a href="/changelog" className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            View our Changelog
          </a>
        </div>

      </main>
      <MainFooter />
    </div>
  );
}
