import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSaveChatHistory, mockUpdateRegisLead } = vi.hoisted(() => {
  return {
    mockSaveChatHistory: vi.fn(),
    mockUpdateRegisLead: vi.fn(),
  };
});

vi.mock("../../../lib/redis", () => {
  return {
    saveChatHistory: mockSaveChatHistory,
    redis: null,
  };
});

vi.mock("../../../lib/regis", () => {
  return {
    updateRegisLead: mockUpdateRegisLead,
  };
});

vi.mock("../../../lib/db", () => {
  return {
    ensureLeadsTable: vi.fn().mockResolvedValue(undefined),
    pool: null,
  };
});

import { POST } from "@/pages/api/chat";
import type { Message } from "@/types/chat";

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
      body: JSON.stringify({ messages: [] }),
    });

    const response = await POST({ request } as any);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("missing");

    // Restore key
    process.env.ASI1_API_KEY = originalKey;
  });

  it("should process stream, save history, and update Regis lead with attribution", async () => {
    // Mock fetch resolution with readable stream
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: mockStream,
    });

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

    const messages: Message[] = [{ role: "user", content: "hi" }];
    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: {
        "Origin": "http://localhost",
        "Host": "localhost",
      },
      body: JSON.stringify({
        messages,
        sessionId: "session-abc",
        attribution: {
          utm_source: "newsletter",
          gclid: "g123",
        },
      }),
    });

    const response = await POST({ request } as any);
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
    expect(saveCall[0]).toBe("session-abc");
    expect(saveCall[1][1]).toEqual({ role: "assistant", content: "Hello user" });

    // Verify CRM update triggered with correct attribution mapping
    expect(mockUpdateRegisLead).toHaveBeenCalled();
    const regisCall = mockUpdateRegisLead.mock.calls[0];
    expect(regisCall[0]).toBe("session-abc");
    expect(regisCall[2]).toEqual({
      utmSource: "newsletter",
      utmMedium: null,
      utmCampaign: null,
      utmTerm: null,
      utmContent: null,
      gclid: "g123",
      fbclid: null,
      landingPath: null,
      referrer: null,
    });
  });
});
