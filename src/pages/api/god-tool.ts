/**
 * god-tool.ts — God Mode Tool Execution Endpoint
 *
 * POST /api/god-tool
 *
 * Receives { tool, args } from the frontend God Mode handler,
 * executes the requested infrastructure tool, and returns the result as JSON.
 *
 * This endpoint is completely isolated from the SDR chat flow (chat.ts).
 * If this endpoint fails for any reason, the SDR pipeline is NOT affected.
 *
 * Protected by IS_GOD_MODE flag — returns 403 if not active.
 */

import type { APIContext, APIRoute } from 'astro';
import { isGodModeActive, executeGodModeTool } from '@/lib/god-mode';
import { logger } from '@/lib/logger';

export const POST: APIRoute = async ({ request }: APIContext) => {
  // Hard gate — reject immediately if God Mode is not active
  if (!isGodModeActive()) {
    return new Response(
      JSON.stringify({ error: 'God Mode is not active.' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Only allow local/trusted origins (same rules as chat.ts, but stricter)
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  const allowedHosts = new Set(['localhost', '127.0.0.1', 'chat.neoflowoff.agency']);

  let originHostname = '';
  try {
    originHostname = origin ? new URL(origin).hostname : (host?.split(':')[0] ?? '');
  } catch {
    originHostname = '';
  }

  if (!allowedHosts.has(originHostname) && !originHostname.endsWith('.neoflowoff.agency')) {
    logger.warn('GOD_MODE', 'Blocked unauthorized god-tool request', { origin, host });
    return new Response(
      JSON.stringify({ error: 'Unauthorized Origin.' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    const body = (await request.json()) as {
      tool: string;
      args?: Record<string, unknown>;
    };

    const { tool, args = {} } = body;

    if (!tool || typeof tool !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid tool name.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const result = await executeGodModeTool(tool, args);

    logger.info('GOD_MODE', `Tool result for '${tool}'`, { result: result.substring(0, 200) });

    return new Response(
      JSON.stringify({ tool, result }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('GOD_MODE', 'Error executing god tool', err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
