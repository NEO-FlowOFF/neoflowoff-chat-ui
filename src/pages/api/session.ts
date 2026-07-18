import { getOrCreateSessionId } from "@/lib/session";
import type { APIRoute } from "astro";

export const GET: APIRoute = ({ cookies, request }) => {
  try {
    getOrCreateSessionId(cookies, request.url);
    return new Response(JSON.stringify({ ready: true }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Session unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
};
