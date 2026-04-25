/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly AZURE_ENDPOINT: string;
  readonly AZURE_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}