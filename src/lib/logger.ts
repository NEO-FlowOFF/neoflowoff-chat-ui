const DEBUG = process.env.DEBUG === "true" || process.env.NODE_ENV !== "production";
const SILENT_TEST_LOGS =
  process.env.NODE_ENV === "test" && process.env.TEST_LOGS !== "true";

export const logger = {
  debug: (tag: string, message: string, data?: unknown) => {
    if (!DEBUG || SILENT_TEST_LOGS) return;
    console.log(`[${tag}]`, message, data ? JSON.stringify(data) : "");
  },
  info: (tag: string, message: string, data?: unknown) => {
    if (SILENT_TEST_LOGS) return;
    console.log(`[${tag}]`, message, data ? JSON.stringify(data) : "");
  },
  warn: (tag: string, message: string, data?: unknown) => {
    if (SILENT_TEST_LOGS) return;
    console.warn(`[${tag}]`, message, data ? JSON.stringify(data) : "");
  },
  error: (tag: string, message: string, error?: unknown) => {
    if (SILENT_TEST_LOGS) return;
    console.error(
      `[${tag}]`,
      message,
      error instanceof Error ? error.message : error,
    );
  },
};
