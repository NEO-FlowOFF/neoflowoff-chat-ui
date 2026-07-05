/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly ASI1_API_KEY: string;
  readonly ASI1_MODEL: string;
  readonly REDIS_URL: string;
  // Meta Pixel (browser) — PUBLIC_ prefix exposes to client at build time
  readonly PUBLIC_META_PIXEL_ID: string;
  // Meta Conversions API & Marketing API (server-only — NUNCA expor ao cliente)
  readonly META_APP_ID: string;
  readonly META_ACCESS_TOKEN: string;
  readonly META_CAPI_TOKEN: string;
  readonly META_VERIFY_TOKEN: string;
  readonly META_MARKETING_API: string;
  readonly META_TEST_EVENT_CODE: string;
  readonly DB_SSL_MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
