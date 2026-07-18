import { describe, expect, it } from "vitest";
import { SseContentParser } from "../sse";

describe("SSE content parser", () => {
  it("preserves JSON events split across network chunks", () => {
    const parser = new SseContentParser();
    expect(parser.push('data: {"choices":[{"delta":{"con')).toEqual([]);
    expect(
      parser.push('tent":"Olá"}}]}\n\ndata: [DONE]\n').concat(parser.flush()),
    ).toEqual(["Olá"]);
  });
});
