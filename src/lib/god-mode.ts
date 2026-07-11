/**
 * god-mode.ts — Developer Backdoor Module
 *
 * SOVEREIGNTY RULE:
 * This entire module is a no-op when IS_GOD_MODE !== 'true'.
 * Safe for production and white-label: flag absent = module never executes.
 *
 * Safe by design:
 * - check_sql accepts only SELECT queries (no DDL/DML/multi-statement)
 * - get_env_status returns boolean presence only, never the secret value
 * - Flag is read from process.env server-side only, cannot be spoofed via request body
 */

import { pool } from "@/lib/db";
import { logger } from "@/lib/logger";
import { redis } from "@/lib/redis";

// ---------------------------------------------------------------------------
// Flag Guard
// ---------------------------------------------------------------------------

export function isGodModeActive(): boolean {
  return process.env.IS_GOD_MODE === "true";
}

// ---------------------------------------------------------------------------
// System Prompt Injection
// ---------------------------------------------------------------------------

export function getGodModeSystemPrompt(): string {
  return `--- GOD MODE: DEVELOPER INFRASTRUCTURE ASSISTANT ---
You are currently operating in DEVELOPER MODE. Your primary persona as an SDR is SUSPENDED.

Your role now: Infrastructure Testing Assistant for the neoflowoff-chat-ui system.

AVAILABLE TOOLS:
- ping_resend: Test Resend email service connectivity and configuration
- check_sql: Run read-only SELECT queries against the PostgreSQL database
- check_redis: Ping Redis and report latency and connection status
- get_env_status: Report presence/absence of critical environment variables (values NEVER exposed)

BEHAVIOR RULES IN GOD MODE:
1. When the developer asks to test a service, proactively call the relevant tool.
2. Report results clearly and technically. No sales language, no empathy padding.
3. If a tool returns an error, explain what it means operationally.
4. You MAY still answer general questions, but always offer to run a relevant tool if applicable.
5. Prefix all responses with [GOD MODE] so the developer knows the persona is switched.

TRIGGER EXAMPLES:
- 'test resend' -> call ping_resend
- 'how many leads do we have?' -> call check_sql with SELECT COUNT(*) FROM leads
- 'is redis up?' -> call check_redis
- 'which env vars are set?' -> call get_env_status
--- END GOD MODE CONTEXT ---`;
}

// ---------------------------------------------------------------------------
// Tool Definitions (OpenAI-compatible format for ASI1)
// ---------------------------------------------------------------------------

export interface GodModeTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export function getGodModeTools(): GodModeTool[] {
  return [
    {
      type: "function",
      function: {
        name: "ping_resend",
        description:
          "Test Resend email service connectivity by sending a test email to the configured RESEND_TO address. Reports success or failure with HTTP status.",
        parameters: {
          type: "object",
          properties: {
            subject: {
              type: "string",
              description:
                "Optional custom subject for the test email. Defaults to [GOD MODE] Resend Connectivity Test.",
            },
          },
          required: [],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "check_sql",
        description:
          "Execute a read-only SELECT query against the PostgreSQL database. Only SELECT statements permitted -- DDL or DML are rejected.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description:
                "A valid PostgreSQL SELECT query. Must start with SELECT. No semicolons.",
            },
          },
          required: ["query"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "check_redis",
        description:
          "Ping the Redis server and report connection status and round-trip latency in milliseconds.",
        parameters: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "get_env_status",
        description:
          "Report whether critical environment variables are present or absent. Never exposes actual values, only boolean presence.",
        parameters: {
          type: "object",
          properties: {
            keys: {
              type: "array",
              items: { type: "string" },
              description:
                "Optional list of env var names to check. Defaults to all critical vars.",
            },
          },
          required: [],
        },
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Tool Executor
// ---------------------------------------------------------------------------

const CRITICAL_ENV_VARS = [
  "ASI1_API_KEY",
  "RESEND_API_KEY",
  "RESEND_FROM",
  "RESEND_TO",
  "DATABASE_URL",
  "REDIS_URL",
  "META_CAPI_TOKEN",
  "META_ACCESS_TOKEN",
  "FLOWPAY_WEBHOOK_SECRET",
  "SITE_URL",
];

export async function executeGodModeTool(
  toolName: string,
  args: Record<string, unknown>,
): Promise<string> {
  if (!isGodModeActive()) {
    return "ERROR: God Mode is not active. This tool cannot be executed.";
  }

  logger.info("GOD_MODE", `Executing tool: ${toolName}`, { args });

  switch (toolName) {
    case "ping_resend":
      return await execPingResend(args);
    case "check_sql":
      return await execCheckSql(args);
    case "check_redis":
      return await execCheckRedis();
    case "get_env_status":
      return execGetEnvStatus(args);
    default:
      return `ERROR: Unknown God Mode tool '${toolName}'.`;
  }
}

// ---------------------------------------------------------------------------
// Implementations
// ---------------------------------------------------------------------------

async function execPingResend(args: Record<string, unknown>): Promise<string> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "neo@neoflowoff.agency";
  const to = process.env.RESEND_TO || "neo@neoflowoff.agency";
  const subject =
    (args.subject as string) || "[GOD MODE] Resend Connectivity Test";

  if (!apiKey) return "ERROR: RESEND_API_KEY is not set.";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: `NEO One <${from}>`,
        to: to
          .split(",")
          .map((e: string) => e.trim())
          .filter(Boolean),
        subject,
        html: `<p><strong>[GOD MODE TEST]</strong> Resend connectivity verified at ${new Date().toISOString()}.</p>`,
      }),
    });

    const body = await res.json();

    if (res.ok) {
      return `OK Resend -- HTTP ${res.status}. Email ID: ${(body as { id?: string }).id || "unknown"}. Sent to: ${to}.`;
    }
    return `FAIL Resend -- HTTP ${res.status}. Error: ${JSON.stringify(body)}.`;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return `ERROR Resend -- fetch failure: ${message}.`;
  }
}

async function execCheckSql(args: Record<string, unknown>): Promise<string> {
  const query = args.query as string | undefined;

  if (!query) return "ERROR: query argument is required for check_sql.";

  const normalized = query.trim().toUpperCase();
  if (!normalized.startsWith("SELECT")) {
    return `REJECTED: Only SELECT queries are permitted. Got: '${query.substring(0, 80)}'`;
  }
  if (query.includes(";")) {
    return "REJECTED: Multi-statement queries (containing ;) are not allowed.";
  }
  if (!pool) return "ERROR: DATABASE_URL is not configured.";

  try {
    const start = Date.now();
    const result = await pool.query(query);
    const elapsed = Date.now() - start;
    const rowCount = result.rowCount ?? result.rows.length;
    const preview = result.rows.slice(0, 5);
    return `OK SQL -- ${rowCount} row(s) in ${elapsed}ms. Preview (up to 5):
${JSON.stringify(preview, null, 2)}`;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return `ERROR SQL -- ${message}`;
  }
}

async function execCheckRedis(): Promise<string> {
  if (!redis) return "ERROR: REDIS_URL is not configured.";

  try {
    const start = Date.now();
    const pong = await redis.ping();
    const elapsed = Date.now() - start;
    if (pong === "PONG") return `OK Redis -- PONG received in ${elapsed}ms.`;
    return `WARN Redis -- Unexpected response: '${pong}' (${elapsed}ms).`;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return `ERROR Redis -- ${message}`;
  }
}

function execGetEnvStatus(args: Record<string, unknown>): string {
  const requestedKeys = Array.isArray(args.keys)
    ? (args.keys as string[])
    : CRITICAL_ENV_VARS;

  const lines = requestedKeys.map((key) => {
    const present = !!process.env[key];
    return `  ${present ? "SET" : "MISSING"} ${key}`;
  });

  return `ENV STATUS (${requestedKeys.length} vars checked):\n${lines.join("\n")}`;
}
