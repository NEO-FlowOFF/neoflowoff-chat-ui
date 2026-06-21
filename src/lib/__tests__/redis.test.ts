import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRedis } = vi.hoisted(() => {
  return {
    mockRedis: {
      get: vi.fn(),
      set: vi.fn(),
      on: vi.fn(),
    },
  };
});

vi.mock("ioredis", () => {
  return {
    default: class MockedRedis {
      get = mockRedis.get;
      set = mockRedis.set;
      on = mockRedis.on;
    },
  };
});

import { getChatHistory, saveChatHistory } from "@/lib/redis";
import { type Message } from "@/types/chat";

describe("Redis Helper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty array if no history exists", async () => {
    mockRedis.get.mockResolvedValue(null);
    const history = await getChatHistory("session-123");
    expect(history).toEqual([]);
    expect(mockRedis.get).toHaveBeenCalledWith("chat:session-123");
  });

  it("should parse and return parsed history if it exists", async () => {
    const data: Message[] = [{ role: "user", content: "hello" }];
    mockRedis.get.mockResolvedValue(JSON.stringify(data));
    const history = await getChatHistory("session-123");
    expect(history).toEqual(data);
  });

  it("should truncate history to last 40 messages when saving", async () => {
    const longHistory: Message[] = Array.from({ length: 50 }, (_, i) => ({
      role: "user",
      content: `msg ${i}`,
    }));

    await saveChatHistory("session-123", longHistory);
    expect(mockRedis.set).toHaveBeenCalled();
    const setCallArgs = mockRedis.set.mock.calls[0];
    expect(setCallArgs[0]).toBe("chat:session-123");
    
    const savedData = JSON.parse(setCallArgs[1]);
    expect(savedData.length).toBe(40);
    expect(savedData[0].content).toBe("msg 10"); // checks index slice(-40)
    expect(setCallArgs[2]).toBe("EX");
    expect(setCallArgs[3]).toBe(60 * 60 * 24 * 7); // 7 days expiration
  });
});
