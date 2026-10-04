import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
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

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const TITLE = "SaveForLatter — Save it now, find it later";
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
  applicationName: "SaveForLatter",
  openGraph: { type: "website", siteName: "SaveForLatter", title: TITLE, description: DESCRIPTION, url: "/" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  // Installed to an iPhone's home screen, open full-screen under this name.
  appleWebApp: { capable: true, title: "SaveForLatter", statusBarStyle: "default" },
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
