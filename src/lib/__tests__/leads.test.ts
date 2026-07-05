import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPool } = vi.hoisted(() => {
  return {
    mockPool: {
      query: vi.fn(),
    },
  };
});

vi.mock("../db", () => {
  return {
    pool: mockPool,
  };
});

// Mock the email functions since they might be triggered
vi.mock("../emails", () => {
  return {
    sendHandoffNotification: vi.fn(),
    sendVisitorConfirmation: vi.fn(),
    sendConversationSummary: vi.fn(),
  };
});

import { upsertLead, type Lead } from "@/lib/leads";
import { sendHandoffNotification } from "../emails";

describe("Leads Helper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not upsert if there is no data besides sessionId", async () => {
    const emptyLead: Lead = { sessionId: "session-123" };
    await upsertLead(emptyLead);
    expect(mockPool.query).not.toHaveBeenCalled();
  });

  it("should upsert if lead has basic data", async () => {
    // Mock SELECT query returning no existing lead
    mockPool.query.mockResolvedValueOnce({ rows: [] });
    // Mock INSERT query
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const lead: Lead = {
      sessionId: "session-123",
      nome: "John Doe",
    };

    await upsertLead(lead);

    expect(mockPool.query).toHaveBeenCalledTimes(2);
    
    // First query should be the select check
    expect(mockPool.query.mock.calls[0][0]).toContain("SELECT nome, empresa");
    expect(mockPool.query.mock.calls[0][1]).toEqual(["session-123"]);

    // Second query should be the insert query
    expect(mockPool.query.mock.calls[1][0]).toContain("INSERT INTO leads");
    expect(mockPool.query.mock.calls[1][1]).toContain("John Doe");
  });

  it("should upsert if lead has only UTM/tracking data", async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const lead: Lead = {
      sessionId: "session-123",
      utmSource: "google",
    };

    await upsertLead(lead);

    expect(mockPool.query).toHaveBeenCalledTimes(2);
    expect(mockPool.query.mock.calls[1][0]).toContain("INSERT INTO leads");
    expect(mockPool.query.mock.calls[1][1]).toContain("google");
  });

  it("should use COALESCE for first-touch tracking parameter persistence", async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const lead: Lead = {
      sessionId: "session-123",
      utmSource: "google",
      gclid: "g-123",
    };

    await upsertLead(lead);

    const insertSql = mockPool.query.mock.calls[1][0];
    // Verify first-touch COALESCE logic exists in the SQL query string
    expect(insertSql).toContain("utm_source      = COALESCE(leads.utm_source,   EXCLUDED.utm_source)");
    expect(insertSql).toContain("gclid           = COALESCE(leads.gclid,        EXCLUDED.gclid)");
  });

  it("should trigger sendHandoffNotification when lead is qualified for Speed-to-Lead", async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] }); // check existing
    mockPool.query.mockResolvedValueOnce({ rows: [] }); // insert
    mockPool.query.mockResolvedValueOnce({ rows: [] }); // update handoff_sent

    const lead: Lead = {
      sessionId: "session-hot-1",
      nome: "Carlos Silva",
      telefone: "62999999999",
      visitorIntent: "automação de atendimento",
      utmCampaign: "agentes_ai",
    };

    await upsertLead(lead);

    expect(sendHandoffNotification).toHaveBeenCalledTimes(1);
    expect(sendHandoffNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: "Carlos Silva",
        telefone: "62999999999",
        utmCampaign: "agentes_ai",
      })
    );
  });
});
