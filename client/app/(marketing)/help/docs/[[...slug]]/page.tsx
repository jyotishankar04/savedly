import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import { createRelativeLink } from "fumadocs-ui/mdx";
import { source } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";

/**
 * A section (/help/docs/ai) has guides inside it but no page of its own.
 * Its address is still one people reach, by trimming a URL or from a
 * breadcrumb, so it leads to the section's first guide, in sidebar order.
 */
function firstGuideInSection(slug: string[] | undefined): string | null {
  if (slug?.length !== 1) return null;
  const prefix = `/help/docs/${slug[0]}/`;
  for (const node of source.pageTree.children) {
    if (node.type !== "folder") continue;
    const first = node.children.find((child) => child.type === "page");
    if (first?.type === "page" && first.url.startsWith(prefix)) return first.url;
  }
  return null;
}

export default async function DocPage(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) {
    const guide = firstGuideInSection(params.slug);
    if (guide) redirect(guide);
    notFound();
  }

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX components={getMDXComponents({ a: createRelativeLink(source, page) })} />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: { params: Promise<{ slug?: string[] }> }): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) {
    // A section address: the page itself redirects to its first guide.
    if (firstGuideInSection(params.slug)) return {};
    notFound();
  }

  return {
    title: `${page.data.title} · Help · Savedly`,
    description: page.data.description,
  };
}
