"use client";

import { useQuery } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";
import { getInstanceSettings, type SettingSection } from "@/lib/instance-settings";
import { SectionCard } from "@/components/admin/instance-section-form";

// Admin -> Infrastructure: file storage, vector store, email, embeddings and
// OAuth for a self-hosted install. Rendered straight from the server's field
// metadata (server/src/modules/instance-settings/instance-settings.registry.ts).
// Hosted production is configured through env, so there only the sections
// marked editable (Included AI) can be changed; the rest are read-only.

export default function AdminInfrastructurePage() {
  const { data, isLoading, isError } = useQuery({ queryKey: ["admin", "instance-settings"], queryFn: getInstanceSettings });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Spinner />
      </div>
    );
  }
  if (isError || !data) {
    return <p className="text-xs text-destructive">Couldn&apos;t load infrastructure settings.</p>;
  }

  return (
    <div className="space-y-8 max-w-xl">
      <div className="space-y-1.5">
        <h1 className="text-lg font-bold text-foreground">Infrastructure</h1>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {data.selfHosted
            ? "Everything works out of the box with local disk, the built-in vector store and no email. Change any of it here. A value set with an environment variable always wins and can't be edited on this page."
            : "This server is configured through environment variables. Included AI can be changed here; everything else is read-only."}
        </p>
      </div>

      {sortSections(data).map((section) => (
        <SectionCard
          key={section.id}
          section={section}
          editable={section.editable}
          callbackUrl={
            section.id === "googleAuth" ? data.callbackUrls.google : section.id === "githubAuth" ? data.callbackUrls.github : undefined
          }
        />
      ))}
    </div>
  );
}

/** On hosted production, the one section you can change goes first. */
function sortSections(data: { selfHosted: boolean; sections: SettingSection[] }): SettingSection[] {
  if (data.selfHosted) return data.sections;
  return [...data.sections.filter((s) => s.editable), ...data.sections.filter((s) => !s.editable)];
}
