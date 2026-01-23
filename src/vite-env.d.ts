/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GATEWAY_SERVER_URL: string;
  readonly VITE_BEATFEED_URL: string;
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
