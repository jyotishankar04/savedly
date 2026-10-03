import type { ReactNode } from "react";
import { RootProvider } from "fumadocs-ui/provider/next";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { source } from "@/lib/source";
import { baseOptions } from "@/lib/layout.shared";

// The docs space has its own chrome: no marketing navbar or footer. Theme
// state comes from the app's existing next-themes provider (app/layout.tsx),
// so the docs follow the same light/dark toggle; the app's own Ctrl/Cmd+D
// shortcut stays the only one.
export default function DocsSectionLayout({ children }: { children: ReactNode }) {
  return (
    <RootProvider theme={{ enabled: false, hotKey: false }}>
      <DocsLayout tree={source.getPageTree()} {...baseOptions()}>
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
