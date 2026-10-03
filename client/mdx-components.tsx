import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { GuideActions } from "@/components/help/guide-actions";

// Components available to every .mdx file under content/docs.
export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    GuideActions,
    ...components,
  } satisfies MDXComponents;
}

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
