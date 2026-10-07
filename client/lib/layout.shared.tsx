import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

// Shared by the docs layout. The docs space has no navbar of its own, so the
// way back to the Help Center hub is an explicit link here.
export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: "Savedly Help",
      url: "/help",
    },
    links: [{ text: "← Back to Help Center", url: "/help", active: "none" }],
  };
}
