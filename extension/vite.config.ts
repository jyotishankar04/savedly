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
function generateManifestPlugin(apiOrigin: string, local: boolean): Plugin {
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
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
      }
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
    plugins: [react(), generateManifestPlugin(apiOrigin, local)],
    // Replaced in the source as plain text, so the content script (which
    // can't import anything, see content-script.ts) can use them too.
    define: {
      __API_ORIGIN__: JSON.stringify(apiOrigin),
      __WEB_APP_URL__: JSON.stringify(webAppUrl),
    },
    build: {
      outDir: "dist",
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
