const DEBUG = process.env.DEBUG === "true" || process.env.NODE_ENV !== "production";

export const logger = {
  debug: (tag: string, message: string, data?: unknown) => {
    if (!DEBUG) return;
    console.log(`[${tag}]`, message, data ? JSON.stringify(data) : "");
  },
  info: (tag: string, message: string, data?: unknown) => {
    console.log(`[${tag}]`, message, data ? JSON.stringify(data) : "");
  },
  warn: (tag: string, message: string, data?: unknown) => {
    console.warn(`[${tag}]`, message, data ? JSON.stringify(data) : "");
  },
  error: (tag: string, message: string, error?: unknown) => {
    console.error(
      `[${tag}]`,
      message,
      error instanceof Error ? error.message : error,
    );
  },
};
