import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import fs from "fs";

/**
 * Generates host_permissions in the built manifest based on the target server
 * origin. A local build is also named "Savedly (local)", so it can't be
 * mistaken for the Web Store one installed beside it (same icon, different
 * server: clicking the wrong one shows "Sign in").
 */
function generateManifestPlugin(apiOrigin: string, local: boolean, firefox: boolean): Plugin {
  return {
    name: "vite-plugin-generate-manifest",
    writeBundle(options) {
      const outDir = options.dir || resolve(__dirname, "dist");
      const manifestPath = resolve(outDir, "manifest.json");
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
        // The API, and every site: the content script already runs on every site
        // (so the install warning is the same), and this lets the extension
        // load it into tabs open since before an install or update, and tell
        // the side panel which page any tab shows.
        manifest.host_permissions = [`${apiOrigin.replace(/\/+$/, "")}/*`, "<all_urls>"];
        if (local) {
          manifest.name = "Savedly (local)";
          manifest.short_name = "Savedly local";
          manifest.action.default_title = "Save to Savedly (local)";
        }
        if (firefox) toFirefox(manifest, local);
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
      }
    },
  };
}

/**
 * The same extension for Firefox (pnpm build:firefox, into dist-firefox):
 * Firefox runs the background as a script rather than a service worker, has a
 * sidebar instead of Chrome's side panel (opened by its own built-in command),
 * and needs a fixed add-on id and a statement of what data the add-on sends.
 */
function toFirefox(manifest: Record<string, any>, local: boolean) {
  manifest.background = { scripts: ["background.js"], type: "module" };
  delete manifest.minimum_chrome_version;
  manifest.permissions = manifest.permissions.filter((p: string) => p !== "sidePanel");
  delete manifest.side_panel;
  manifest.sidebar_action = {
    default_panel: "src/sidepanel/sidepanel.html",
    default_title: manifest.name,
    default_icon: manifest.action.default_icon,
    open_at_install: false,
  };
  const panel = manifest.commands["open-side-panel"];
  delete manifest.commands["open-side-panel"];
  manifest.commands._execute_sidebar_action = { ...panel, description: "Open Savedly in the sidebar" };
  manifest.browser_specific_settings = {
    gecko: {
      id: local ? "savedly-local@savedly.app" : "savedly@savedly.app",
      strict_min_version: "140.0",
      // Sent to Savedly: what's on a page you save (its address, title, text,
      // a screenshot), and the address of the page you're on while the
      // sidebar is open, to show whether it's saved.
      data_collection_permissions: { required: ["websiteContent", "browsingActivity"] },
    },
  };
}

// Which Savedly the extension talks to is driven by Vite environment variables:
//   VITE_SERVER_ORIGIN  -> backend API origin (e.g. https://api.savedly.app or http://localhost:4000)
//   VITE_WEB_APP_URL    -> web dashboard address (e.g. https://savedly.app or http://localhost:3000)
// Defaults to localhost in development, or the hosted app for production builds.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const local = mode === "development";
  // pnpm build:firefox sets this; everything else builds for Chrome.
  const firefox = process.env.TARGET === "firefox";

  const apiOrigin = (
    env.VITE_SERVER_ORIGIN ||
    process.env.VITE_SERVER_ORIGIN ||
    process.env.SAVEDLY_API_ORIGIN ||
    (local ? "http://localhost:4000" : "https://api.savedly.app")
  ).replace(/\/+$/, "");

  const webAppUrl = (
    env.VITE_WEB_APP_URL ||
    process.env.VITE_WEB_APP_URL ||
    process.env.SAVEDLY_WEB_URL ||
    (local ? "http://localhost:3000" : "https://savedly.app")
  ).replace(/\/+$/, "");

  return {
    plugins: [react(), generateManifestPlugin(apiOrigin, local, firefox)],
    // Replaced in the source as plain text, so the content script (which
    // can't import anything, see content-script.ts) can use them too.
    define: {
      __API_ORIGIN__: JSON.stringify(apiOrigin),
      __WEB_APP_URL__: JSON.stringify(webAppUrl),
      __FIREFOX__: JSON.stringify(firefox),
    },
    build: {
      outDir: firefox ? "dist-firefox" : "dist",
      emptyOutDir: true,
      rollupOptions: {
        input: {
          popup: resolve(__dirname, "src/popup/popup.html"),
          sidepanel: resolve(__dirname, "src/sidepanel/sidepanel.html"),
          welcome: resolve(__dirname, "src/welcome/welcome.html"),
          background: resolve(__dirname, "src/background/service-worker.ts"),
          content: resolve(__dirname, "src/content/content-script.ts"),
        },
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === "background" || chunkInfo.name === "content") {
              return "[name].js";
            }
            return "assets/[name]-[hash].js";
          },
        },
      },
    },
  };
});
