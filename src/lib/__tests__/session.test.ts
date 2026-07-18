import { beforeEach, describe, expect, it } from "vitest";
import { getOrCreateSessionId, readSessionId } from "../session";

function cookiesMock() {
  const values = new Map<string, string>();
  return {
    values,
    cookies: {
      get(name: string) {
        const value = values.get(name);
        return value ? { value } : undefined;
      },
      set(name: string, value: string) {
        values.set(name, value);
      },
    } as any,
  };
}

describe("signed chat session", () => {
  beforeEach(() => {
    process.env.SESSION_SIGNING_SECRET =
      "test-session-secret-with-at-least-32-characters";
  });

  it("reuses a valid signed cookie", () => {
    const { cookies } = cookiesMock();
    const first = getOrCreateSessionId(cookies, "https://example.com/chat");
    expect(getOrCreateSessionId(cookies, "https://example.com/chat")).toBe(first);
  });

  it("rejects a tampered session cookie", () => {
    const { cookies, values } = cookiesMock();
    getOrCreateSessionId(cookies, "https://example.com/chat");
    values.set("neo_session", `${values.get("neo_session")}tampered`);
    expect(readSessionId(cookies)).toBeNull();
  });
});
