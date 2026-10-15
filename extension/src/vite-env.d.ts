/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SERVER_ORIGIN?: string;
  readonly VITE_WEB_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Set when the extension is built (see vite.config.ts).
declare const __API_ORIGIN__: string;
declare const __WEB_APP_URL__: string;
