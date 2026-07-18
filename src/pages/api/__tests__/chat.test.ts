import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockCheckChatRateLimit,
  mockGetChatHistory,
  mockSaveChatHistory,
  mockUpdateRegisLead,
} = vi.hoisted(() => {
  return {
    mockCheckChatRateLimit: vi.fn().mockResolvedValue(true),
    mockGetChatHistory: vi.fn().mockResolvedValue([]),
    mockSaveChatHistory: vi.fn(),
    mockUpdateRegisLead: vi.fn(),
  };
});

vi.mock("../../../lib/redis", () => ({
  checkChatRateLimit: mockCheckChatRateLimit,
  getChatHistory: mockGetChatHistory,
  getSlidingWindow: <T>(messages: T[], limit: number) =>
    messages.slice(-limit),
  saveChatHistory: mockSaveChatHistory,
  redis: null,
}));

vi.mock("../../../lib/regis", () => {
  return {
    updateRegisLead: mockUpdateRegisLead,
  };
});

vi.mock("../../../lib/db", () => {
  return {
    ensureLeadsTable: vi.fn().mockResolvedValue(undefined),
    ensureSuspiciousEventsTable: vi.fn().mockResolvedValue(undefined),
    pool: null,
  };
});

import { POST } from "@/pages/api/chat";

// Mock global fetch
const mockReader = {
  read: vi.fn(),
};
const mockStream = {
  getReader: () => mockReader,
};
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("Chat API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SESSION_SIGNING_SECRET = "test-session-secret-with-at-least-32-characters";
    mockFetch.mockImplementation((url: unknown) => {
      if (typeof url === "string" && url.includes("graph.facebook.com")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ events_received: 1 }),
        });
      }
      return Promise.resolve({
        ok: true,
        body: mockStream,
      });
    });
  });

  it("should return 500 if ASI1_API_KEY env is missing", async () => {
    // Temporarily delete env key
    const originalKey = process.env.ASI1_API_KEY;
    delete process.env.ASI1_API_KEY;

    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: {
        "Origin": "http://localhost",
        "Host": "localhost",
      },
      body: JSON.stringify({ message: "hi" }),
    });

    const response = await POST({ request, cookies: createCookies() } as any);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("missing");

    // Restore key
    process.env.ASI1_API_KEY = originalKey;
  });

  it("should process stream, save history, and update Regis lead with attribution", async () => {

    // Mock reader chunks
    const encoder = new TextEncoder();
    mockReader.read
      .mockResolvedValueOnce({
        done: false,
        value: encoder.encode('data: ' + JSON.stringify({ choices: [{ delta: { content: "Hello user" } }] }) + '\n'),
      })
      .mockResolvedValueOnce({
        done: false,
        value: encoder.encode('data: [DONE]\n'),
      })
      .mockResolvedValueOnce({
        done: true,
      });

    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: {
        "Origin": "http://localhost",
        "Host": "localhost",
      },
      body: JSON.stringify({
        message: "hi",
        attribution: {
          utm_source: "newsletter",
          utm_campaign: "agentes_ai",
          context: "vendas_b2b",
          gclid: "g123",
        },
      }),
    });

    const response = await POST({ request, cookies: createCookies() } as any);
    expect(response.status).toBe(200);

    // Consume stream to trigger starting start() block functions
    const reader = response.body?.getReader();
    while (true) {
      const { done } = await reader!.read();
      if (done) break;
    }

    // Verify chat history saved to Redis
    expect(mockSaveChatHistory).toHaveBeenCalled();
    const saveCall = mockSaveChatHistory.mock.calls[0];
    expect(saveCall[0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(saveCall[1][1]).toEqual({ role: "assistant", content: "Hello user" });

    // Verify CRM update triggered with correct attribution mapping
    expect(mockUpdateRegisLead).toHaveBeenCalled();
    const regisCall = mockUpdateRegisLead.mock.calls[0];
    expect(regisCall[0]).toBe(saveCall[0]);
    expect(regisCall[2]).toEqual({
      utmSource: "newsletter",
      utmMedium: null,
      utmCampaign: "agentes_ai",
      utmTerm: null,
      utmContent: null,
      gclid: "g123",
      fbclid: null,
      landingPath: null,
      referrer: null,
    });

    // Verify LLM received attribution prompt with UTMs and context
    expect(mockFetch).toHaveBeenCalled();
    const fetchArgs = mockFetch.mock.calls[0];
    expect(fetchArgs[0]).toBe("https://api.asi1.ai/v1/chat/completions");
    const fetchBody = JSON.parse(fetchArgs[1].body);
    const sysMsg = fetchBody.messages[0].content;
    expect(sysMsg).toContain("DADOS DE ATRIBUIÇÃO E ORIGEM DO CLIENTE (UTMs)");
    expect(sysMsg).toContain("Campanha: agentes_ai");
    expect(sysMsg).toContain("Contexto da URL: vendas_b2b");
  });
});

function createCookies() {
  const values = new Map<string, string>();
  return {
    get(name: string) {
      const value = values.get(name);
      return value ? { value } : undefined;
    },
    set(name: string, value: string) {
      values.set(name, value);
    },
  };
}
