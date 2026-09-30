"use client";

import { SECTION } from "@/components/marketing/landing/feature-rows-section";

const STEPS = [
  { step: "01", name: "Save it", example: "Paste a link, drop a PDF, or record a voice memo. That's the only manual step." },
  { step: "02", name: "Let AI process", example: "The server reads, transcribes, summarizes, and generates semantic vector embeddings." },
  { step: "03", name: "Find it instantly", example: "Search by meaning, or chat with your vault to get cited answers." },
];

export function HowItWorksTable() {
  return (
    <section className={SECTION}>
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-8 text-2xl font-semibold tracking-tight text-foreground font-mono">
          How it works. Under the hood: vectors, embeddings, and automatic organization.
        </h2>
        
        <div className="w-full overflow-hidden rounded-xl border border-foreground/10 bg-card/50">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-foreground/10 bg-foreground/5 text-muted-foreground font-mono">
              <tr>
                <th className="py-3 pl-6 pr-4 font-medium w-16">Step</th>
                <th className="py-3 px-4 font-medium w-1/3">Action</th>
                <th className="py-3 px-4 font-medium">Under the hood</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/10">
              {STEPS.map((s) => (
                <tr key={s.step} className="transition-colors hover:bg-foreground/5">
                  <td className="py-4 pl-6 pr-4 font-mono text-muted-foreground">{s.step}</td>
                  <td className="py-4 px-4 font-medium text-foreground">{s.name}</td>
                  <td className="py-4 px-4 text-muted-foreground">{s.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
