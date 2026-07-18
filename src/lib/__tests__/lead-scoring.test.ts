import { describe, expect, it } from "vitest";
import { scoreLead } from "../lead-scoring";

describe("lead scoring", () => {
  it("keeps curiosity low instead of assigning a generic 50", () => {
    const result = scoreLead({ commercialIntent: "curiosity" });
    expect(result.intentScore).toBe(20);
    expect(result.leadScore).toBe(0);
    expect(result.poiDetected).toBe(false);
  });

  it("requires verbatim evidence before accepting POI", () => {
    const result = scoreLead({
      commercialIntent: "action_request",
      poiDetected: true,
      poiEvidence: null,
    });
    expect(result.intentScore).toBe(90);
    expect(result.poiDetected).toBe(false);
  });

  it("qualifies and releases handoff only with name, valid WhatsApp and commercial intent", () => {
    const result = scoreLead({
      nome: "Ana",
      telefone: "+55 11 99999-9999",
      empresa: "Acme",
      produtoInteresse: "Agent SDR",
      commercialIntent: "action_request",
      poiDetected: true,
      poiEvidence: "quero uma proposta",
    });
    expect(result.leadScore).toBe(70);
    expect(result.intentScore).toBe(90);
    expect(result.qualified).toBe(true);
    expect(result.handoffReady).toBe(true);
  });
});
