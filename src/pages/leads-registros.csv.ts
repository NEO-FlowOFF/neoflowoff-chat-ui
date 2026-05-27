import type { APIRoute } from "astro";
import { getLeadSnapshotCsv, leadSnapshotDate } from "../lib/leads-snapshot";

export const GET: APIRoute = () =>
  new Response(getLeadSnapshotCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-registros-${leadSnapshotDate}.csv"`,
      "Cache-Control": "no-store",
    },
  });
