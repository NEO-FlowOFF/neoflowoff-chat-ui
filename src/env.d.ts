/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly VENICE_API_KEY: string;
  readonly VENICE_MODEL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
