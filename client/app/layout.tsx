import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/common/theme-provider";
import { ThemeShortcut } from "@/components/common/theme-shortcut";
import { Toaster } from "@/components/ui/toast";
import { QueryProvider } from "./providers";
import { AnnouncementGate } from "@/components/announcements/announcement-gate";
import { ComingSoonGate } from "@/components/showcase/coming-soon-gate";
import { InstallPrompt } from "@/components/install-prompt";
import { ServiceWorker } from "@/components/service-worker";
import { StandaloneRedirect } from "@/components/standalone-redirect";

// The fonts are files in this repository (app/fonts, all under the SIL Open
// Font License), not fetched from Google at build time: a build then needs no
// network, which matters for people building the self-hosted Docker image.
const inter = localFont({ src: "./fonts/inter-latin.woff2", weight: "100 900", variable: "--font-sans", display: "swap" });

const geistSans = localFont({ src: "./fonts/geist-latin.woff2", weight: "100 900", variable: "--font-geist-sans", display: "swap" });

const geistMono = localFont({ src: "./fonts/geist-mono-latin.woff2", weight: "100 900", variable: "--font-geist-mono", display: "swap" });

const TITLE = "Savedly — Save it now, find it later";
const DESCRIPTION = "Your personal memory for the internet. Save links, notes, videos, and screenshots, and find them again with a search that understands what you meant.";

// Social previews need absolute image URLs. Netlify sets URL at build time;
// NEXT_PUBLIC_SITE_URL overrides it (e.g. for a custom domain).
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.URL ?? "http://localhost:3000";

// The icons and share image are file-based: app/icon.svg, favicon.ico,
// apple-icon.png, opengraph-image.png, twitter-image.png.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "Savedly",
  openGraph: { type: "website", siteName: "Savedly", title: TITLE, description: DESCRIPTION, url: "/" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  // Installed to an iPhone's home screen, open full-screen under this name.
  appleWebApp: { capable: true, title: "Savedly", statusBarStyle: "default" },
};

// The browser and status bar take the page's own background, light or dark.
// viewportFit lets the layout reach the edges of a notched phone; the safe-area
// insets are then available to anything that has to stay clear of them.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#171717" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}
      suppressHydrationWarning
    >
    <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {/* Chrome can announce "this site is installable" before React has
            loaded; keep the event for components/install-prompt.tsx. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__installPrompt=e});`,
          }}
        />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ThemeShortcut />
          <StandaloneRedirect />
          <ServiceWorker />
          <InstallPrompt />
          <QueryProvider>
            <Toaster>
              <ComingSoonGate>
                <AnnouncementGate>{children}</AnnouncementGate>
              </ComingSoonGate>
            </Toaster>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
