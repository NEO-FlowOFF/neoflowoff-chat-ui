/**
 * Centralized logging utility for neoflowoff-chat-ui.
 * Respects NODE_ENV and DEBUG flag for consistent log output.
 */

const DEBUG = process.env.DEBUG === "true" || process.env.NODE_ENV !== "production";

export const logger = {
  /**
   * Debug logs - only shown in development or when DEBUG=true
   */
  debug: (tag: string, message: string, data?: unknown) => {
    if (!DEBUG) return;
    console.log(`[${tag}]`, message, data ? JSON.stringify(data) : "");
  },

  /**
   * Info logs - always shown
   */
  info: (tag: string, message: string, data?: unknown) => {
    console.log(`[${tag}]`, message, data ? JSON.stringify(data) : "");
  },

  /**
   * Warning logs - always shown
   */
  warn: (tag: string, message: string, data?: unknown) => {
    console.warn(`[${tag}]`, message, data ? JSON.stringify(data) : "");
  },

  /**
   * Error logs - always shown
   */
  error: (tag: string, message: string, error?: unknown) => {
    console.error(
      `[${tag}]`,
      message,
      error instanceof Error ? error.message : error,
    );
  },
};

