import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// Which Savedly the extension talks to is fixed when it is built:
//   pnpm build        -> savedly.app (what goes to the Chrome Web Store)
//   pnpm build:local  -> a server and web app running on this machine
// A self-hosted install builds its own copy with SAVEDLY_API_ORIGIN and
// SAVEDLY_WEB_URL set to its addresses.
export default defineConfig(({ mode }) => {
  const local = mode === "development";
  const apiOrigin = (process.env.SAVEDLY_API_ORIGIN ?? (local ? "http://localhost:4000" : "https://api.savedly.app")).replace(/\/+$/, "");
  const webAppUrl = (process.env.SAVEDLY_WEB_URL ?? (local ? "http://localhost:3000" : "https://savedly.app")).replace(/\/+$/, "");

  return {
    plugins: [react()],
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
