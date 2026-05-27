/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly ASI1_API_KEY: string;
  readonly ASI1_MODEL: string;
  readonly REDIS_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
